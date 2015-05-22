'use strict';

var EventEmitter = require('events').EventEmitter,
    debug = require('debug')('amqp10-client'),
    util = require('util'),

    Connection = require('./connection'),
    M = require('./types/message'),
    Sasl = require('./sasl'),
    Session = require('./session').Session,
    Link = require('./session').Link,

    constants = require('./constants'),
    exceptions = require('./exceptions'),
    DescribedType = require('./types/described_type'),
    Fields = require('./types/amqp_composites').Fields,
    ForcedType = require('./types/forced_type'),
    ST = require('./types/source_target'),
    DeliveryStates = require('./types/delivery_state'),
    Source = ST.Source,
    Target = ST.Target,

    Translator = require('./adapters/translate_encoder'),

    PolicyBase = require('./policies/policy_base'),
    EHPolicy = require('./policies/event_hub_policy'),
    SBQueuePolicy = require('./policies/service_bus_queue_policy'),
    SBTopicPolicy = require('./policies/service_bus_topic_policy'),

    u = require('./utilities'),
    putils = require('./policies/policy_utilities');



/**
 * AMQPClient is the top-level class for interacting with node-amqp10.  Instantiate this class, connect, and then send/receive
 * as needed and behind the scenes it will do the appropriate work to setup and teardown connections, sessions, and links and manage flow.
 * The code does its best to avoid exposing AMQP-specific types and attempts to convert them where possible, but on the off-chance you
 * need to speak AMQP-specific (e.g. to set a filter to a described-type), you can use node-amqp-encoder and the
 * AMQPClient.adapters.Translator adapter to convert it to our internal types.  See simple_eventhub_test.js for an example.
 *
 * Configuring AMQPClient is done through a Policy class.  By default, PolicyBase will be used - it assumes AMQP defaults wherever
 * possible, and for values with no spec-defined defaults it tries to assume something reasonable (e.g. timeout, max message size).
 *
 * To define a new policy, you can merge your values into an existing one by calling AMQPClient.policies.merge(yourPolicy, existingPolicy).
 * This does a deep-merge, allowing you to only replace values you need.  For instance, if you wanted the default sender settle policy to be auto-settle instead of mixed,
 * you could just use
 *
 <pre>
 var AMQPClient = require('amqp10');
 var client = new AMQPClient(AMQPClient.policies.merge({
                  senderLinkPolicy: {
                    options: { senderSettleMode: AMQPClient.constants.senderSettleMode.settled } } });
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
 * @param {PolicyBase} [policy]     Policy to use for connection, sessions, links, etc.  Defaults to PolicyBase.
 * @constructor
 */
function AMQPClient(policy) {
  // Make a protective copy
  this._originalPolicy = u.deepMerge(policy || PolicyBase);
  this.policy = u.deepMerge(this._originalPolicy);
  this._connection = null;
  this._reconnect = null;
  this._session = null;
  this._sendMsgId = 1;
  this._attaching = {};
  this._reattach = {};
  this._attached = {};
  this._onReceipt = {};
  this._pendingSends = {};
  this._unsettledSends = {};
}
util.inherits(AMQPClient, EventEmitter);

// Events - mostly for internal use.
AMQPClient.ErrorReceived = 'ErrorReceived'; // Called with error
AMQPClient.ConnectionOpened = 'Connection.Opened';
AMQPClient.SessionMapped = 'Session.Mapped';
AMQPClient.LinkAttached = 'Link.Attached'; // Called with link
AMQPClient.LinkDetached = 'Link.Detached'; // Called with link
AMQPClient.SessionUnmapped = 'Session.Unmapped';
AMQPClient.ConnectionClosed = 'Connection.Closed';


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
 * Map of various pre-defined policies (including PolicyBase), as well as a merge function allowing you
 * to create your own.
 */
AMQPClient.policies = {
  'PolicyBase': PolicyBase,
  'EventHubPolicy': EHPolicy,
  'ServiceBusQueuePolicy': SBQueuePolicy,
  'ServiceBusTopicPolicy': SBTopicPolicy,
  merge: function(newPolicy, base) { return u.deepMerge(newPolicy, base || PolicyBase); },
  utils: putils
};


/**
 * Connects to a given AMQP server endpoint, and then calls the associated callback.  Sets the default queue, so e.g.
 * amqp://my-activemq-host/my-queue-name would set the default queue to my-queue-name for future send/receive calls.
 *
 * @param {string} url      URI to connect to - right now only supports <code>amqp|amqps</code> as protocol.
 */
AMQPClient.prototype.connect = function(url) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self._connection) {
      self._connection.close();
      self._clearConnectionState();
    }

    debug('Connecting to ' + url);
    self._reconnect = self.connect.bind(self, url, function() {});
    var address = u.parseAddress(url);
    self._defaultQueue = address.path.substr(1);
    self.policy.connectPolicy.options.hostname = address.host;
    var sasl = address.user ? new Sasl() : null;
    self._connection = self._newConnection();
    self._connection.on(Connection.Connected, function(c) {
      debug('Connected');
      self.emit(AMQPClient.ConnectionOpened);
      self._session = self._newSession(c);
      self._session.on(Session.Mapped, function(s) {
        debug('Mapped');
        resolve(self);
        self.emit(AMQPClient.SessionMapped);
      });

      self._session.on(Session.Unmapped, function(s) {
        debug('Unmapped');
        self.emit(AMQPClient.SessionUnmapped);
      });

      self._session.on(Session.ErrorReceived, function(e) {
        debug('Session error: ', e);
        self.emit(AMQPClient.ErrorReceived, e);
      });

      self._session.on(Session.LinkAttached, function(l) {
        self.emit(AMQPClient.LinkAttached, l);
      });

      self._session.on(Session.LinkDetached, function(l) {
        debug('Link ' + l.name + ' detached');
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
              debug('Invalid messageId: ' + messageId);
            }
          }
        }
      });

      self._session.begin(self.policy.sessionPolicy);
    });

    self._connection.on(Connection.Disconnected, function() {
      debug('Disconnected');
      self.emit(AMQPClient.ConnectionClosed);
      if (self._shouldReconnect()) {
        self._attemptReconnection();
      } else {
        self._clearConnectionState(false);
      }
    });

    self._connection.on(Connection.ErrorReceived, function(e) {
      debug('Connection error: ', e);
      reject(e);
      self.emit(AMQPClient.ErrorReceived, e);
    });

    self._connection.open(address, sasl);
  });
};


/**
 * Sends the given message, with the given options, to the given target.
 *
 * @param {*} msg               Message to send.  Will be encoded using sender link policy's encoder.
 * @param {string} [target]     Target to send to.  If not set, will use default queue from uri used to connect.
 * @param {*} [options]         An object of options to attach to the message including: annotations, properties,
                                and application properties
 * @param options.annotations   Annotations for the message, if any.  See AMQP spec for details, and server for specific
 *                               annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd
 *                               map is given, it will be translated to appropriate internal types.  Simple maps will be converted
 *                               to AMQP Fields type as defined in the spec.
 * @param {function} cb         Callback, by default called when settled disposition is received from target, with (error, delivery-state).
 *                              However, setting the sender callback policy to OnSent can change when this is called to as soon as the packets go out.
 */
AMQPClient.prototype.send = function(msg, target, options, cb) {
  if (!this._connection) { throw new Error('Must connect before sending'); }

  var self = this;
  if (cb === undefined) {
    if (options === undefined) {
      cb = target;
      target = undefined;
    } else {
      if (typeof target === 'string') {
        cb = options;
        options = undefined;
      } else {
        cb = options;
        options = target;
        target = undefined;
      }
    }
  }

  if (!target) {
    target = this._defaultQueue;
  }

  var linkName = target + '_TX';
  // Set some initial state for the link.
  if (this._pendingSends[linkName] === undefined) this._pendingSends[linkName] = [];
  if (this._attached[linkName] === undefined) this._attached[linkName] = null;
  if (this._attaching[linkName] === undefined) this._attaching[linkName] = false;

  var message = new M.Message();
  if (options) {
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
  }

  var enc = this.policy.senderLinkPolicy.encoder;
  message.body.push(enc ? enc(msg) : msg);
  var curId = self._sendMsgId++;

  var sender = function(err, _link) {
    if (_link.name === linkName) {
      if (err) {
        cb(err);
      } else {
        debug('Sending ', msg);
        var msgId = _link.sendMessage(message, {deliveryTag: new Buffer(curId.toString())});
        var cbPolicy = self.policy.senderLinkPolicy.callbackPolicy;
        if (cbPolicy === putils.SenderCallbackPolicies.OnSettle) {
          self._unsettledSends[msgId] = cb;
        } else if (cbPolicy === putils.SenderCallbackPolicies.OnSent) {
          cb(null);
        } else {
          throw exceptions.ArgumentError('Invalid sender callback policy: ' + cbPolicy);
        }
      }
    }
  };

  if (this._attaching[linkName]) {
    // We're connecting, but our link isn't yet attached.  Add ourselves to the list for calling when attached.
    this._pendingSends[linkName].push(sender);
    return;
  }

  var attach = function() {
    self._attaching[linkName] = true;
    var onAttached = function(l) {
      if (l.name === linkName) {
        debug('Sender link ' + linkName + ' attached');
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
          debug('Credit received');
          while (self._pendingSends[linkName] && self._pendingSends[linkName].length > 0 && _l.canSend()) {
            var curSend = self._pendingSends[linkName].shift();
            curSend(null, _l);
          }
        });
        l.on(Link.Detached, function(details) {
          debug('Link detached: ' + (details ? details.error : 'No details'));
          self._attached[linkName] = undefined;
          if (self._pendingSends[linkName].length > 0) {
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
      }, self.policy.senderLinkPolicy);
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
        }, self.policy.senderLinkPolicy);
        self._session.attachLink(linkPolicy);
      };
      self.on(AMQPClient.SessionMapped, onMapped);
    }
  };

  this._reattach[linkName] = attach;

  if (!this._attached[linkName]) {
    self._pendingSends[linkName].push(sender);
    attach();
    return;
  }

  var link = this._attached[linkName];
  if (link.canSend()) {
    sender(null, link);
  } else {
    this._pendingSends[linkName].push(sender);
  }
};


/**
 * Set up callback to be called whenever message is received from the given source (subject to the given filter).
 * Callback is called with (error, payload, annotations), and the payload is decoded using the receiver link policy's
 * decoder method.
 *
 * @param {string} [source]     Source of the link to connect to.  If not provided will use default queue from connection uri.
 * @param {*} [filter]          Filter used in connecting to the source.  See AMQP spec for details, and your server's documentation
 *                               for possible values.  node-amqp-encoder'd maps will be translated, and simple maps will be converted
 *                               to AMQP Fields type as defined in the spec.
 * @param {function} cb         Callback to invoke on every receipt.  Called with (error, payload, options).
 */
AMQPClient.prototype.receive = function(source, filter, cb) {
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
  // Set some initial state for the link.
  if (this._onReceipt[linkName] === undefined) this._onReceipt[linkName] = [];
  if (this._attached[linkName] === undefined) this._attached[linkName] = null;
  if (this._attaching[linkName] === undefined) this._attaching[linkName] = false;

  this._onReceipt[linkName].push(cb);
  if (this._attaching[linkName] || this._attached[linkName]) return;

  var attach = function() {
    var onAttached = function(l) {
      if (l.name === linkName) {
        debug('Receiver link ' + linkName + ' attached');
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
        });

        l.on(Link.MessageReceived, function(m) {
          var payload = m.body[0];
          var decoded = l.policy.decoder ? l.policy.decoder(payload) : payload;
          debug('Received ' + decoded + ' from ' + source);
          var cbs = self._onReceipt[linkName];
          if (cbs && cbs.length > 0) {
            var options = {};
            if (m.annotations) options.annotations = m.annotations;
            if (m.properties) options.properties = m.properties;

            cbs.forEach(function (cb) {
              cb(null, decoded, options);
            });
          }
        });

        l.on(Link.Detached, function(details) {
          debug('Link detached: ' + (details ? details.error : 'No details'));
          self._attached[linkName] = undefined;
          attach();
        });
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
      }, self.policy.receiverLinkPolicy);
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
        }, self.policy.receiverLinkPolicy);
        self._session.attachLink(linkPolicy);
      };
      self.on(AMQPClient.SessionMapped, onMapped);
    }
  };

  this._reattach[linkName] = attach;

  if (!this._attached[linkName]) {
    attach();
  }
};

/**
 * Disconnect tears down any existing connection with appropriate Close
 * performatives and TCP socket teardowns.
 *
 * @method disconnect
 * @return {Promise}
 */
AMQPClient.prototype.disconnect = function() {
  return new Promise(function(resolve, reject) {
    debug('Disconnecting');
    if (this._connection) {
      var self = this;
      this._preventReconnect();
      this._connection.on(Connection.Disconnected, function() {
        self._connection = null;
        resolve();
      });
      this._connection.close();
      this._clearConnectionState();
    } else {
      resolve(); // Already disconnected, just call the callback.
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
  return new Connection(this.policy.connectPolicy);
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
  if (Object.keys(this._onReceipt).length > 0) return true;

  var pendingSends = 0;
  for (var pendingSend in this._pendingSends) {
    pendingSends += pendingSend.length;
  }
  return pendingSends > 0;
};

AMQPClient.prototype._attemptReconnection = function() {
  this._clearConnectionState(true);
  var self = this;
  var onReconnect = function() {
    debug('Reconnected and remapped, attempting to re-attach links.');
    self.removeListener(AMQPClient.SessionMapped, onReconnect);
    for (var ln in self._reattach) {
      debug('Reattaching ' + ln);
      self._reattach[ln]();
    }
  };
  self.on(AMQPClient.SessionMapped, onReconnect);
  self._reconnect();
};

module.exports = AMQPClient;
