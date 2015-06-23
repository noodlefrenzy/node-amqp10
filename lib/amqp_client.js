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
  this._sendMsgId = 1;
  this._attaching = {};
  this._attached = {};
  this._onReceipt = {};
  this._pendingSends = {};
  this._unsettledSends = {};

  this._reconnect = null;
  this._reattach = {};
  if (!!this.policy.reconnect) {
    this._timeouts = u.generateTimeouts(this.policy.reconnect);
  }
}
util.inherits(AMQPClient, EventEmitter);

// Events - mostly for internal use.
AMQPClient.ErrorReceived = 'client:errorReceived'; // Called with error
AMQPClient.ConnectionOpened = 'connection:opened';
AMQPClient.SessionMapped = 'session:mapped';
AMQPClient.LinkAttached = 'link:attached'; // Called with link
AMQPClient.LinkDetached = 'link:detached'; // Called with link
AMQPClient.SessionUnmapped = 'session:unmapped';
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
      self._session = self._newSession(c);
      self._session.on(Session.Mapped, function(s) {
        debug('mapped');
        resolve(self);
        self.emit(AMQPClient.SessionMapped);
      });

      self._session.on(Session.Unmapped, function(s) {
        debug('unmapped');
        self.emit(AMQPClient.SessionUnmapped);
      });

      self._session.on(Session.ErrorReceived, function(e) {
        debug('session error: ', e);
        self.emit(AMQPClient.ErrorReceived, e);
      });

      self._session.on(Session.LinkAttached, function(l) {
        self.emit(AMQPClient.LinkAttached, l);
      });

      self._session.on(Session.LinkDetached, function(l) {
        debug('link deatched: ' + l.name);
        self.emit(AMQPClient.LinkDetached, l);
      });

      self._session.on(Session.DispositionReceived, function(details) {
        if (details.settled) {
          var err = null;
          if (details.state instanceof DeliveryStates.Rejected) {
            err = details.state.error;
          }

          var first = details.first;
          var last = details.last || first;
          for (var messageId = first; messageId <= last; ++messageId) {
            if (self._unsettledSends[messageId]) {
              self._unsettledSends[messageId](err, details.state);
              delete self._unsettledSends[messageId];
            } else {
              debug('invalid message-id: ' + messageId);
            }
          }
        }
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

      if (!self._timeouts.length)
        self._timeouts = u.generateTimeouts(self.policy.reconnect);

      setTimeout(function() {
        // @todo: see _attemptReconnection below for more detail, but bail here
        //        using .done() for now
        return self._attemptReconnection().done();
      }, self._timeouts.shift());
    });

    self._connection.on(Connection.ErrorReceived, function(e) {
      debug('connection error: ', e);
      reject(e);
      self.emit(AMQPClient.ErrorReceived, e);
    });

    self._connection.open(address, sasl);
  });
};


/**
 * Sends the given message, with the given options, to the given target.
 *
 * @method send
 * @param {*} msg               Message to send.  Will be encoded using sender link policy's encoder.
 * @param {string} [target]     Target to send to.  If not set, will use default queue from uri used to connect.
 * @param {*} [options]         An object of options to attach to the message including: annotations, properties,
                                and application properties
 * @param options.annotations   Annotations for the message, if any.  See AMQP spec for details, and server for specific
 *                               annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd
 *                               map is given, it will be translated to appropriate internal types.  Simple maps will be converted
 *                               to AMQP Fields type as defined in the spec.
 *
 * @return {Promise}
 */
AMQPClient.prototype.send = function(msg, target, options) {
  if (!this._connection) { throw new Error('Must connect before sending'); }

  var self = this;
  return new Promise(function(resolve, reject) {

    if (!target) {
      target = self._defaultQueue;
    }

    var linkName = target + '_TX';
    // Set some initial state for the link.
    if (self._pendingSends[linkName] === undefined) self._pendingSends[linkName] = [];
    if (self._attached[linkName] === undefined) self._attached[linkName] = null;
    if (self._attaching[linkName] === undefined) self._attaching[linkName] = false;

    var message = new M.Message();
    if (options) {
      if (options.header) {
        message.header = new M.Header(options.header);
      }

      if (options.deliveryAnnotations) {
        message.annotations =
          new M.DeliveryAnnotations(options.deliveryAnnotations);
      }

      if (options.annotations) {
        message.annotations = new M.Annotations(options.annotations);
      }

      if (options.properties) {
        message.properties = new M.Properties(options.properties);
      }

      if (options.applicationProperties) {
        message.applicationProperties =
          new M.ApplicationProperties(options.applicationProperties);
      }

      if (options.footer) {
        message.footer = new M.Footer(options.footer);
      }
    }

    var enc = self.policy.senderLink.encoder;
    message.body.push(enc ? enc(msg) : msg);
    var curId = self._sendMsgId++;

    var deferredSender = function(err, state) {
      if (!!err) {
        reject(err);
      } else {
        resolve(state);
      }
    };

    var sender = function(err, _link) {
      if (_link.name === linkName) {
        if (err) {
          reject(err);
        } else {
          debug('sending: ', msg);
          var msgId = _link.sendMessage(message, {deliveryTag: new Buffer(curId.toString())});
          var cbPolicy = self.policy.senderLink.callback;
          if (cbPolicy === putils.SenderCallbackPolicies.OnSettle) {
            self._unsettledSends[msgId] = deferredSender;
          } else if (cbPolicy === putils.SenderCallbackPolicies.OnSent) {
            resolve();
          } else {
            throw errors.ArgumentError('Invalid sender callback policy: ' + cbPolicy);
          }
        }
      }
    };

    if (self._attaching[linkName]) {
      // We're connecting, but our link isn't yet attached.  Add ourselves to the list for calling when attached.
      self._pendingSends[linkName].push(sender);
      return;
    }

    var attach = function() {
      self._attaching[linkName] = true;
      var onAttached = function(l) {
        if (l.name === linkName) {
          debug('sender link attached: ' + linkName);
          self.removeListener(AMQPClient.LinkAttached, onAttached);
          self._attaching[linkName] = false;
          self._attached[linkName] = l;
          while (self._pendingSends[linkName] && self._pendingSends[linkName].length > 0 && l.canSend()) {
            var curSend = self._pendingSends[linkName].shift();
            curSend(null, l);
          }

          l.on(Link.ErrorReceived, function(err) {
            if (self._pendingSends[linkName] && self._pendingSends[linkName].length > 0) {
              self._pendingSends[linkName].forEach(function (pendingSend) {
                pendingSend(err, l);
              });
            }
            self.emit(AMQPClient.ErrorReceived, err);
          });

          l.on(Link.CreditChange, function(_l) {
            debug('credit received');
            while (self._pendingSends[linkName] && self._pendingSends[linkName].length > 0 && _l.canSend()) {
              var curSend = self._pendingSends[linkName].shift();
              curSend(null, _l);
            }
          });

          l.on(Link.Detached, function(details) {
            debug('link detached: ' + (details ? details.error : 'No details'));
            self._attached[linkName] = undefined;
            if (self._pendingSends[linkName] && self._pendingSends[linkName].length > 0) {
              attach();
            }
          });
        }
      };
      self.on(AMQPClient.LinkAttached, onAttached);
      if (self._session) {
        var linkPolicy = u.deepMerge({
          options: {
            name: linkName,
            source: {address: 'localhost'},
            target: {address: target}
          }
        }, self.policy.senderLink);
        self._session.attachLink(linkPolicy);
      } else {
        var onMapped = function() {
          self.removeListener(AMQPClient.SessionMapped, onMapped);
          var linkPolicy = u.deepMerge({
            options: {
              name: linkName,
              source: {address: 'localhost'},
              target: {address: target}
            }
          }, self.policy.senderLink);
          self._session.attachLink(linkPolicy);
        };
        self.on(AMQPClient.SessionMapped, onMapped);
      }
    };

    self._reattach[linkName] = attach;

    if (!self._attached[linkName]) {
      self._pendingSends[linkName].push(sender);
      attach();
      return;
    }

    var link = self._attached[linkName];
    if (link.canSend()) {
      sender(null, link);
    } else {
      self._pendingSends[linkName].push(sender);
    }
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
 * @param {*} [filter]          Filter used in connecting to the source.  See AMQP spec for details, and your server's documentation
 *                              for possible values.  node-amqp-encoder'd maps will be translated, and simple maps will be converted
 *                              to AMQP Fields type as defined in the spec.
 * @param {function} cb         Callback to invoke on every receipt.  Called with (error, message).
 *
 * @return {Promise}
 */
AMQPClient.prototype.createReceiver = function(source, filter, cb) {
  if (!this._connection) { throw new Error('Must connect before receiving'); }

  var self = this;
  if (cb === undefined) {
    if (typeof source === 'function') {
      cb = source;
      source = this._defaultQueue;
      filter = undefined;
    } else if (typeof source !== 'string') {
      cb = filter;
      filter = source;
      source = this._defaultQueue;
    } else {
      cb = filter;
      filter = undefined;
    }
  }
  if (filter && filter instanceof Array && filter[0] === 'map') {
    // Convert encoded values
    filter = AMQPClient.adapters.Translator(filter);
  }

  var linkName = source + '_RX';
  if (this._attaching[linkName]) {
    self._onReceipt[linkName].push(cb);

    return new Promise(function(resolve, reject) {
      var attachingListener = function(link) {
        if (link.name === linkName) {
          self.removeListener(AMQPClient.LinkAttached, attachingListener);
          resolve(link);
        }
      };

      self.on(AMQPClient.LinkAttached, attachingListener);
    });
  }

  return new Promise(function(resolve, reject) {
    if (self._attached[linkName])
      return resolve(self._attached[linkName]);

    // otherwise create the link, and set initial state
    if (self._onReceipt[linkName] === undefined) self._onReceipt[linkName] = [];
    if (self._attached[linkName] === undefined) self._attached[linkName] = null;
    if (self._attaching[linkName] === undefined) self._attaching[linkName] = false;

    self._onReceipt[linkName].push(cb);

    var attach = function() {
      self._attaching[linkName] = true;

      var onAttached = function(l) {
        if (l.name === linkName) {
          debug('receiver link attached: ' + linkName);
          self.removeListener(AMQPClient.LinkAttached, onAttached);
          self._attaching[linkName] = false;
          self._attached[linkName] = l;

          l.on(Link.ErrorReceived, function(err) {
            var cbs = self._onReceipt[linkName];
            if (cbs && cbs.length > 0) {
              cbs.forEach(function (cb) {
                cb(err);
              });
            }

            // @todo: most likely never called, research a way to properly
            //        resolve or reject this promise.
            reject(err);
          });

          l.on(Link.MessageReceived, function(message) {
            var payload = message.body[0] || message.body;
            message.body = l.policy.decoder ? l.policy.decoder(payload) : payload;
            debug('received from (' + source + '): ' + message.body);
            var cbs = self._onReceipt[linkName];
            if (cbs && cbs.length > 0) {
              cbs.forEach(function (cb) {
                cb(null, message);
              });
            }
          });

          l.on(Link.Detached, function(details) {
            debug('link detached: ' + (details ? details.error : 'No details'));
            self._attached[linkName] = undefined;

            // @todo: investigate options/policies for auto-reattach
            // attach();
          });

          resolve(l);
        }
      };

      self.on(AMQPClient.LinkAttached, onAttached);

      if (self._session) {
        var linkPolicy = u.deepMerge({
          options: {
            name: linkName,
            source: {address: source, filter: filter},
            target: {address: 'localhost'}
          }
        }, self.policy.receiverLink);
        self._session.attachLink(linkPolicy);
      } else {
        var onMapped = function() {
          self.removeListener(AMQPClient.SessionMapped, onMapped);
          var linkPolicy = u.deepMerge({
            options: {
              name: linkName,
              source: {address: source, filter: filter},
              target: {address: 'localhost'}
            }
          }, self.policy.receiverLink);
          self._session.attachLink(linkPolicy);
        };
        self.on(AMQPClient.SessionMapped, onMapped);
      }
    };

    self._reattach[linkName] = attach;

    if (!self._attached[linkName]) {
      attach();
    }
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
  this._attached = {};
  this._attaching = {};
  this._unsettledSends = {};
  this._connection = null;
  this._session = null;
  // Copy from original to avoid any settings changes "sticking" across connections.
  this.policy = u.deepMerge(this._originalPolicy);

  if (!saveReconnectDetails) {
    this._pendingSends = {};
    this._onReceipt = {};
    this._reattach = {};
    this._reconnect = null;
  }
};

// Helper methods for mocking in tests.
AMQPClient.prototype._newConnection = function() {
  return new Connection(this.policy.connect);
};

AMQPClient.prototype._newSession = function(conn) {
  return new Session(conn);
};

AMQPClient.prototype._preventReconnect = function() {
  this._reconnect = null;
  this._reattach = {};
  this._pendingSends = {};
  this._onReceipt = {};
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
    .then(function() {
      debug('reconnected and remapped, attempting to re-attach links');
      Object.keys(self._reattach).forEach(function(link) {
        debug('reattaching link: ' + link);
        self._reattach[link]();
      });
    })
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
