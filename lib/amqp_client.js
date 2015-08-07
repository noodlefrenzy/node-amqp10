'use strict';

var EventEmitter = require('events').EventEmitter,
    Promise = require('bluebird'),
    debug = require('debug')('amqp10:client'),
    util = require('util'),

    Connection = require('./connection'),
    M = require('./types/message'),
    Sasl = require('./sasl'),
    Session = require('./session'),
    Link = require('./link'),

    constants = require('./constants'),
    errors = require('./errors'),
    DescribedType = require('./types/described_type'),
    Fields = require('./types/amqp_composites').Fields,
    ForcedType = require('./types/forced_type'),
    ST = require('./types/source_target'),
    DeliveryStates = require('./types/delivery_state'),
    Source = ST.Source,
    Target = ST.Target,

    Translator = require('./adapters/translate_encoder'),
    DefaultPolicy = require('./policies/default_policy'),

    u = require('./utilities'),
    putils = require('./policies/policy_utilities');



/**
 * AMQPClient is the top-level class for interacting with node-amqp10.  Instantiate this class, connect, and then send/receive
 * as needed and behind the scenes it will do the appropriate work to setup and teardown connections, sessions, and links and manage flow.
 * The code does its best to avoid exposing AMQP-specific types and attempts to convert them where possible, but on the off-chance you
 * need to speak AMQP-specific (e.g. to set a filter to a described-type), you can use node-amqp-encoder and the
 * AMQPClient.adapters.Translator adapter to convert it to our internal types.  See simple_eventhub_test.js for an example.
 *
 * Configuring AMQPClient is done through a Policy class.  By default, DefaultPolicy will be used - it assumes AMQP defaults wherever
 * possible, and for values with no spec-defined defaults it tries to assume something reasonable (e.g. timeout, max message size).
 *
 * To define a new policy, you can merge your values into an existing one by calling AMQPClient.policies.merge(yourPolicy, existingPolicy).
 * This does a deep-merge, allowing you to only replace values you need.  For instance, if you wanted the default sender settle policy to be auto-settle instead of mixed,
 * you could just use
 *
 <pre>
 var AMQPClient = require('amqp10').Client;
 var client = new AMQPClient(AMQPClient.policies.merge({
   senderLink: {
     options: {
       senderSettleMode: AMQPClient.constants.senderSettleMode.settled
     }
   }
 });
 </pre>
 *
 * Obviously, setting some of these options requires some in-depth knowledge of AMQP, so I've tried to define specific policies where I can.
 * For instance, for Azure EventHub connections, you can use the pre-build EventHubPolicy.
 *
 * Also, within the policy, see the encoder and decoder defined in the send/receive policies.  These define what to do with the message
 * sent/received, and by default do a simple pass-through, leaving the encoding to/decoding from AMQP-specific types up to the library which
 * does a best-effort job.  See EventHubPolicy for a more complicated example, turning objects into UTF8-encoded buffers of JSON-strings.
 *
 * If, on construction, you provide a uri and a callback, I will immediately attempt to connect, allowing you to go directly from
 * instantiation to sending messages.
 *
 * @param {DefaultPolicy} [policy]     Policy to use for connection, sessions, links, etc.  Defaults to DefaultPolicy.
 * @constructor
 */
function AMQPClient(policy) {
  // Make a protective copy
  this._originalPolicy = u.deepMerge(policy || DefaultPolicy);
  this.policy = u.deepMerge(this._originalPolicy);
  this._connection = null;
  this._session = null;

  this._reconnect = null;
  if (!!this.policy.reconnect) {
    this._timeouts = u.generateTimeouts(this.policy.reconnect);
  }
}
util.inherits(AMQPClient, EventEmitter);

// Events - mostly for internal use.
AMQPClient.ErrorReceived = 'client:errorReceived'; // Called with error

AMQPClient.ConnectionOpened = 'connection:opened';
AMQPClient.ConnectionClosed = 'connection:closed';


/**
 * Exposes various AMQP-related constants, for use in policy overrides.
 */
AMQPClient.constants = constants;


/**
 * Map of various adapters from other AMQP-reliant libraries to the interface herein.
 *
 * Of primary interest in Translator, which allows you to translate from node-amqp-encoder'd values into the
 * internal types used in this library.  (e.g. [ 'symbol', 'symval' ] => Symbol('symval') ).
 */
AMQPClient.adapters = {
  'Translator': Translator
};

/**
 * Connects to a given AMQP server endpoint. Sets the default queue, so e.g.
 * amqp://my-activemq-host/my-queue-name would set the default queue to
 * my-queue-name for future send/receive calls.
 *
 * @method connect
 * @param {string} url      URI to connect to - right now only supports <code>amqp|amqps</code> as protocol.
 *
 * @return {Promise}
 */
AMQPClient.prototype.connect = function(url) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self._connection) {
      self._connection.close();
      self._clearConnectionState();
    }

    debug('connecting to: ' + url);
    self._reconnect = self.connect.bind(self, url);
    var address = u.parseAddress(url);
    self._defaultQueue = address.path.substr(1);
    self.policy.connect.options.hostname = address.host;
    var sasl = address.user ? new Sasl() : null;
    self._connection = self._newConnection();
    self._connection.on(Connection.Connected, function(c) {
      debug('connected');
      self.emit(AMQPClient.ConnectionOpened);
      if (self._session) {
        debug('session already exists, re-using');
        self._session.connection = self._connection;
      } else {
        self._session = self._newSession(c);
      }

      self._session.on(Session.Mapped, function(s) {
        debug('mapped');
        resolve(self);
      });

      self._session.begin(self.policy.session);
    });

    self._connection.on(Connection.Disconnected, function() {
      debug('disconnected');
      self.emit(AMQPClient.ConnectionClosed);
      if (!self._shouldReconnect()) {
        self._clearConnectionState(false);
        return reject(new errors.DisconnectedError());
      }

      if (!self._timeouts.length) self._timeouts = u.generateTimeouts(self.policy.reconnect);

      setTimeout(function() {
        // @todo: see _attemptReconnection below for more detail, but bail here
        //        using .done() for now
        return self._attemptReconnection().done();
      }, self._timeouts.shift());
    });

    self._connection.open(address, sasl);
  });
};

/**
 * Creates a sender link for the given address, with optional link options
 *
 * @method createSender
 * @param {string} [address]    An address to connect this link to
 * @param {*} [options]         Options used for creating the link
 *
 * @return {Promise}
 */
AMQPClient.prototype.createSender = function(address, options) {
  if (!this._connection) {
    throw new Error('Must connect before creating links');
  }

  address = u.parseLinkAddress(address || this._defaultQueue, this.policy);
  options = options || {};

  var linkName = u.linkName(address.name, options),
      linkPolicy = u.deepMerge({
        options: {
          name: linkName,
          source: { address: 'localhost' },
          target: { address: address.name }
        }
      }, this.policy.senderLink);

  if (!!address.subject && this.policy.defaultSubjects) {
    linkPolicy.defaultSubject = address.subject;
  }

  var self = this;
  return new Promise(function(resolve, reject) {
    var attach = function() {
      var attachPromise = function(_err, _link) {
        if (!!_err) return reject(_err);
        return resolve(_link);
      };

      var link = self._session.createLink(linkPolicy);
      link._onAttach.push(attachPromise);
    };

    attach();
  });
};

/**
 * Set up a callback to be called whenever message is received from the given source (subject to the given filter).
 * Callback is called with (error, message), and the payload is decoded using the receiver link policy's
 * decoder method. The method itself returns a promise which is resolved with receiver link information
 * once it's attached.
 *
 * @method createReceiver
 * @param {string} [source]     Source of the link to connect to.  If not provided will use default queue from connection uri.
 * @param {Object} [options]    Options used for link creation
 * @param options.filter        Filter used in connecting to the source.  See AMQP spec for details, and your server's documentation
 *                              for possible values.  node-amqp-encoder'd maps will be translated, and simple maps will be converted
 *                              to AMQP Fields type as defined in the spec.
 *
 * @return {Promise}
 */
AMQPClient.prototype.createReceiver = function(address, options) {
  if (!this._connection) {
    throw new Error('Must connect before creating links');
  }

  address = u.parseLinkAddress(address || this._defaultQueue, this.policy);
  options = options || {};

  var linkName = u.linkName(address.name, options),
      linkPolicy = u.deepMerge({
        options: {
          name: linkName,
          source: { address: address.name },
          target: { address: 'localhost' }
        }
      }, this.policy.receiverLink);

  if (options) {
    if (options.filter && options.filter instanceof Array && options[0] === 'map') {
      // Convert encoded values
      options.filter = AMQPClient.adapters.Translator(options.filter);
      linkPolicy.source.filter = options.filter;
    }

    if (options.policy) {
      linkPolicy = u.deepMerge(linkPolicy, options.policy);
    }
  }

  // if a subject has been provided then automatically set up a filter to match
  // on that subject.
  if (!!address.subject && this.policy.defaultSubjects) {
    var filterSymbol = (address.subject.indexOf('*') || address.subject.indexOf('#')) ?
      'apache.org:legacy-amqp-topic-binding:string' :
      'apache.org:legacy-amqp-direct-binding:string';

    linkPolicy.options.source.filter = AMQPClient.adapters.Translator([
      'described', ['symbol', filterSymbol], ['string', address.subject]
    ]);
  }

  var self = this;
  return new Promise(function(resolve, reject) {
    var attach = function() {
      var attachPromise = function(_err, _link) {
        if (!!_err) return reject(_err);
        return resolve(_link);
      };

      var link = self._session.createLink(linkPolicy);
      link._onAttach.push(attachPromise);
    };

    attach();
  });
};

/**
 * Disconnect tears down any existing connection with appropriate Close
 * performatives and TCP socket teardowns.
 *
 * @method disconnect
 * @return {Promise}
 */
AMQPClient.prototype.disconnect = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    debug('disconnecting');
    if (self._connection) {
      self._preventReconnect();
      self._connection.on(Connection.Disconnected, function() {
        self._connection = null;
        resolve();
      });
      self._connection.close();
      self._clearConnectionState();
    } else {
      resolve(); // Already disconnected, just deliver the promise.
    }
  });
};

AMQPClient.prototype._clearConnectionState = function(saveReconnectDetails) {
  this._connection = null;

  // Copy from original to avoid any settings changes "sticking" across connections.
  this.policy = u.deepMerge(this._originalPolicy);

  if (!saveReconnectDetails) {
    this._reconnect = null;
  }
};

// Helper methods for mocking in tests.
AMQPClient.prototype._newConnection = function() {
  var self = this;
  var connection = new Connection(this.policy.connect);
  connection.on(Connection.ErrorReceived, function(e) {
    debug('connection error: ', e);
    self.emit(AMQPClient.ErrorReceived, e);
  });

  return connection;
};

AMQPClient.prototype._newSession = function(conn) {
  var self = this;
  var session = new Session(conn);
  session.on(Session.Unmapped, function(s) {
    debug('unmapped');
  });

  session.on(Session.ErrorReceived, function(e) {
    debug('session error: ', e);
    self.emit(AMQPClient.ErrorReceived, e);
  });

  return session;
};

AMQPClient.prototype._preventReconnect = function() {
  this._reconnect = null;
};

AMQPClient.prototype._shouldReconnect = function() {
  if (!this._connection || !this._reconnect) return false;
  if (!this._timeouts.length && !this.policy.reconnect.forever) return false;
  return true;
};

AMQPClient.prototype._attemptReconnection = function() {
  this._clearConnectionState(true);

  var self = this;
  return self._reconnect()
    .catch(function(err) {
      self.emit(AMQPClient.ErrorReceived, err);

      // @todo: this is problematic, since we're not passing the reconnect
      //        promise back to sender. As such, it will signal two uncaught
      //        exceptions, and then dump and quit the program. Need to find a
      //        better way to tie the reconnect promise to the original request.
      if (!self._shouldReconnect())
        throw err;  // rethrow
    });
};

module.exports = AMQPClient;
