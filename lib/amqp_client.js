'use strict';
var EventEmitter = require('events').EventEmitter,
    Promise = require('bluebird'),
    debug = require('debug')('amqp10:client'),
    util = require('util'),

    Connection = require('./connection'),
    Sasl = require('./sasl'),
    Session = require('./session'),
    ReceiverStream = require('./streams/receiver_stream'),
    SenderStream = require('./streams/sender_stream'),

    errors = require('./errors'),

    translator = require('./adapters/translate_encoder'),
    Policy = require('./policies/policy'),

    pu = require('./policies/policy_utilities'),
    u = require('./utilities');

/**
 * AMQPClient is the top-level class for interacting with node-amqp10.  Instantiate this class, connect, and then send/receive
 * as needed and behind the scenes it will do the appropriate work to setup and teardown connections, sessions, and links and manage flow.
 * The code does its best to avoid exposing AMQP-specific types and attempts to convert them where possible, but on the off-chance you
 * need to speak AMQP-specific (e.g. to set a filter to a described-type), you can use node-amqp-encoder and the
 * translator adapter to convert it to our internal types.  See simple_eventhub_test.js for an example.
 *
 * Configuring AMQPClient is done through a Policy class.  By default, DefaultPolicy will be used - it assumes AMQP defaults wherever
 * possible, and for values with no spec-defined defaults it tries to assume something reasonable (e.g. timeout, max message size).
 *
 * To define a new policy, you can merge your values into an existing one by calling AMQPClient.policies.merge(yourPolicy, existingPolicy).
 * This does a deep-merge, allowing you to only replace values you need.  For instance, if you wanted the default sender settle policy to be auto-settle instead of mixed,
 * you could just use
 *
 <pre>
 var AMQP = require('amqp10');
 var client = new AMQP.Client(AMQP.Policy.merge({
   senderLink: {
     attach: {
       senderSettleMode: AMQP.Constants.senderSettleMode.settled
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
 * @param {Policy}  [policy]           Policy to use for connection, sessions, links, etc.  Defaults to DefaultPolicy.
 * @param {Obeject} [policyOverrides]  Additional overrides for the provided policy
 * @constructor
 */
function AMQPClient(policy, policyOverrides) {
  if (!(policy instanceof Policy)) {
    this.policy = pu.Merge(policy, new Policy());
  } else {
    this.policy = policy || new Policy();
    if (!!policyOverrides) this.policy = pu.Merge(policyOverrides, this.policy);
  }

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
    var address = self.policy.parseAddress(url);
    self._defaultQueue = address.path.substr(1);
    self.policy.connect.options.hostname = address.host;
    var sasl = address.user ? new Sasl() : null;
    if (!!sasl && !!address.vhost) {
      sasl._remoteHostname = address.vhost;
      self.policy.connect.options.hostname = address.vhost;
    }

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

      self._session.once(Session.Mapped, function(s) {
        debug('mapped');
        self.emit('connected');
        resolve(self);
      });

      self._session.begin(self.policy.session);
    });

    self._connection.on(Connection.Disconnected, function() {
      debug('disconnected');
      self.emit('disconnected');
      self.emit(AMQPClient.ConnectionClosed);
      if (!self._shouldReconnect()) {
        self._clearConnectionState(false);
        return reject(new errors.DisconnectedError());
      }

      if (!self._timeouts.length)
        self._timeouts = u.generateTimeouts(self.policy.reconnect);

      setTimeout(function() {
        return self._attemptReconnection().then(function() { resolve(self); });
      }, self._timeouts.shift());
    });

    self._connection.open(address, sasl);
  });
};

/**
 * Creates a sender link for the given address, with optional link policy
 *
 * @method createSender
 * @param {String} address                An address to connect this link to. If not provided will use default queue from connection uri.
 * @param {Object} [policyOverrides]      Policy overrides used for creating this sender link
 * @param {String} [policyOverrides.name] Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name]
 *
 * @return {Promise}
 */
AMQPClient.prototype.createSender = function(address, policyOverrides) {
  if (!this._connection) {
    throw new Error('Must connect before creating links');
  }

  address = u.parseLinkAddress(address || this._defaultQueue, this.policy);
  policyOverrides = policyOverrides || {};

  var linkName = u.linkName(address.name, policyOverrides),
      linkPolicy = u.deepMerge({
        attach: {
          name: linkName,
          source: { address: 'localhost' },
          target: { address: address.name }
        }
      }, policyOverrides, this.policy.senderLink);

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
 * Creates a sender link wrapped as a Writable stream
 *
 * @method createSenderStream
 * @param {String} address                Address used for link creation
 * @param {Object} [policyOverrides]      Policy overrides used for creating this sender link
 *
 * @return {Writable}
 */
AMQPClient.prototype.createSenderStream = function(address, policyOverrides) {
  return this.createSender(address, policyOverrides)
    .then(function(link) { return new SenderStream(link); });
};

/**
 * Creates a receiver link for the given address, with optional link policy. The
 * promise returned resolves to a link that is an EventEmitter, which can be
 * used to listen for 'message' events.
 *
 * @method createReceiver
 * @param {String} address                An address to connect this link to.  If not provided will use default queue from connection uri.
 * @param {Object} [policyOverrides]      Policy overrides used for creating this receiver link
 * @param {String} [policyOverrides.name] Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name]
 *
 * @return {Promise}
 */
AMQPClient.prototype.createReceiver = function(address, policyOverrides) {
  if (!this._connection) {
    throw new Error('Must connect before creating links');
  }

  address = u.parseLinkAddress(address || this._defaultQueue, this.policy);
  policyOverrides = policyOverrides || {};

  var linkName = u.linkName(address.name, policyOverrides),
      linkPolicy = u.deepMerge({
        attach: {
          name: linkName,
          source: { address: address.name },
          target: { address: 'localhost' }
        }
      }, policyOverrides, this.policy.receiverLink);

  // if the policy supports the defaultSubjects feature, and a subject has been
  // provided then automatically set up a filter to match on that subject.
  if (this.policy.defaultSubjects && !!address.subject) {
    var filterSymbol = (address.subject.indexOf('*') || address.subject.indexOf('#')) ?
      'apache.org:legacy-amqp-topic-binding:string' :
      'apache.org:legacy-amqp-direct-binding:string';

    linkPolicy.attach.source.filter = {};
    linkPolicy.attach.source.filter[filterSymbol] =
      translator(['described', ['symbol', filterSymbol], ['string', address.subject]]);
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
 * Creates a receiver link wrapped as a Readable stream
 *
 * @method createReceiverStream
 * @param {String} address                Address used for link creation
 * @param {Object} [policyOverrides]      Policy overrides used for creating the receiver link
 *
 * @return {Readable}
 */
AMQPClient.prototype.createReceiverStream = function(address, policyOverrides) {
  // Override default credit behavior, as the stream will handle flow. The
  // creditQuantum will be used as the stream's highWatermark by default.
  policyOverrides = u.deepMerge({
    credit: function() {},
  }, policyOverrides || {});

  return this.createReceiver(address, policyOverrides)
    .then(function(link) { return new ReceiverStream(link); });
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
      var connection = self._connection;
      self._clearConnectionState();
      connection.once(Connection.Disconnected, function() {
        debug('disconnected');
        self.emit('disconnected');
        connection = undefined;
        resolve();
      });
      connection.close();
    } else {
      self.emit('disconnected');
      resolve(); // Already disconnected, just deliver the promise.
    }
  });
};

AMQPClient.prototype._clearConnectionState = function(saveReconnectDetails) {
  if (!!this._connection) this._connection.removeAllListeners();
  this._connection = null;
  if (!saveReconnectDetails) {
    this._reconnect = null;
  }

  if (this._session) this._session._resetLinkState();
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
