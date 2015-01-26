var debug           = require('debug')('amqp10-client'),

    Connection      = require('./lib/connection'),
    M               = require('./lib/types/message'),
    Sasl            = require('./lib/sasl'),
    Session         = require('./lib/session').Session,
    Link            = require('./lib/session').Link,

    DescribedType   = require('./lib/types/described_type'),
    Fields          = require('./lib/types/amqp_composites').Fields,
    ForcedType      = require('./lib/types/forced_type'),
    Symbol          = require('./lib/types/symbol'),
    ST              = require('./lib/types/source_target'),
    Source          = ST.Source,
    Target          = ST.Target,

    Translator      = require('./lib/adapters/translate_encoder'),

    u               = require('./lib/utilities');

function AMQPClient(policy, uri, cb) {
    if (typeof policy === 'string') {
        cb = uri;
        uri = policy;
        policy = undefined;
    }
    this.policy = policy || PolicyBase;
    this._connection = null;
    this._session = null;
    this._sendLinks = {};
    this._receiveLinks = {};
    this._sendMsgId = 1;

    if (uri) {
        this.connect(uri, cb);
    }
}

var EHAdapter = require('./lib/adapters/node_sbus').NodeSbusEventHubAdapter;

/**
 * Map of various adapters from other AMQP-reliant libraries to the interface herein.
 */
AMQPClient.adapters = {
    'NodeSbusEventHubAdapter': EHAdapter,
    'Translator': Translator
};

var PolicyBase      = require('./lib/policies/policy_base'),
    EHPolicy        = require('./lib/policies/event_hub_policy');

AMQPClient.policies = {
    'PolicyBase': PolicyBase,
    'EventHubPolicy': EHPolicy
};

AMQPClient.types = {
    DescribedType: DescribedType,
    Fields: Fields,
    ForcedType: ForcedType,
    Symbol: Symbol,

    Source: Source,
    Target: Target
};

AMQPClient.prototype.connect = function(url, cb) {
    if (this._connection) {
        this._connection.close();
        this._connection = null;
        this._session = null;
    }

    debug('Connecting to ' + url);
    var self = this;
    var address = u.parseAddress(url);
    this._defaultQueue = address.path.substr(1);
    this.policy.connectPolicy.options.hostname = address.host;
    var sasl = address.user ? new Sasl() : null;
    this._connection = new Connection(this.policy.connectPolicy);
    this._connection.on(Connection.Connected, function (c) {
        debug('Connected');
        self._session = new Session(c);
        self._session.on(Session.Mapped, function (s) {
           cb(null, self);
        });
        self._session.begin(self.policy.sessionPolicy);
    });
    this._connection.on(Connection.ErrorReceived, function (e) {
        cb(e, self);
    });
    this._connection.open(address, sasl);
};

AMQPClient.prototype.send = function(msg, target, annotations, cb) {
    if (cb === undefined) {
        if (annotations === undefined) {
            cb = target;
            target = undefined;
        } else {
            if (typeof target === 'string') {
                cb = annotations;
                annotations = undefined;
            } else {
                cb = annotations;
                annotations = target;
                target = undefined;
            }
        }
    }
    if (!target) {
        target = this._defaultQueue;
    }

    var message = new M.Message();
    if (annotations) {
        // Convert encoded values
        if (annotations instanceof Array && annotations[0] === 'map') {
            annotations = AMQPClient.adapters.Translator(annotations);
        }
        message.annotations = new M.Annotations(annotations);
    }
    var enc = this.policy.senderLinkPolicy.encoder;
    message.body.push(enc ? enc(msg) : msg);
    var self = this;
    var errHandler = function(e) {
        cb(e);
    };
    var sender = function(_link) {
        if (_link.canSend()) {
            var curId = self._sendMsgId++;
            debug('Sending ' + msg);
            _link.sendMessage(message, {deliveryTag: new Buffer([curId])});
            _link.removeListener(Link.ErrorReceived, errHandler);
            _link.removeListener(Link.CreditChange, sender);
            cb(null, msg);
        }
    };
    if (this._sendLinks[target]) {
        var link = this._sendLinks[target];
        if (link.canSend()) {
            sender(link);
        } else {
            link.on(Link.ErrorReceived, errHandler);
            link.on(Link.CreditChange, function(_l) {
                sender(_l);
            });
        }
    } else {
        var linkName = target + "_TX";
        var linkPolicy = u.deepMerge({ options: {
            name: linkName,
            source: { address: 'localhost' },
            target: { address: target }
        } }, this.policy.senderLinkPolicy);
        this._session.on(Session.LinkAttached, function (l) {
            if (l.name === linkName) {
                debug('Sender link ' + linkName + ' attached');
                self._sendLinks[target] = l;
                if (l.canSend()) {
                    sender(l);
                } else {
                    l.on(Link.ErrorReceived, errHandler);
                    l.on(Link.CreditChange, function(_l) {
                        sender(_l);
                    });
                }
            }
        });
        this._session.attachLink(linkPolicy);
    }
};

AMQPClient.prototype.receive = function(source, filter, cb) {
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
    if (this._receiveLinks[source]) {
        var link = this._receiveLinks[source];
        debug('Already established Rx Link on ' + source);
    } else {
        var linkName = source + "_RX";
        var linkPolicy = u.deepMerge({ options: {
            name: linkName,
            source: { address: source, filter: filter },
            target: { address: 'localhost' }
        } }, this.policy.receiverLinkPolicy);
        this._session.on(Session.LinkAttached, function (l) {
            if (l.name === linkName) {
                debug('Receiver link ' + linkName + ' attached');
                self._receiveLinks[source] = l;
                l.on(Link.MessageReceived, function (m) {
                    var payload = m.body[0];
                    var decoded = l.policy.decoder ? l.policy.decoder(payload) : payload;
                    debug('Received ' + decoded + ' from ' + source);
                    cb(null, decoded, m.annotations);
                });
            }
        });
        this._session.attachLink(linkPolicy);
    }
};

AMQPClient.prototype.disconnect = function(cb) {
    debug('Disconnecting');
    if (this._connection) {
        this._connection.on(Connection.Disconnected, function() {
           cb();
        });
        this._connection.close();
        this._connection = null;
        this._session = null;
    }
};

module.exports = AMQPClient;
