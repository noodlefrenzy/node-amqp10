var debug           = require('debug')('amqp10-client'),

    Connection      = require('./lib/connection'),
    M               = require('./lib/types/message'),
    Sasl            = require('./lib/sasl'),
    Session         = require('./lib/session').Session,
    Link            = require('./lib/session').Link,
    Source          = require('./lib/types/source_target').Source,
    Target          = require('./lib/types/source_target').Target,

    u               = require('./lib/utilities');

function AMQPClient(policy) {
    this.policy = policy || PolicyBase;
    this._connection = null;
    this._session = null;
    this._sendLinks = {};
    this._receiveLinks = {};
    this._sendMsgId = 1;
}

var EHAdapter = require('./lib/adapters/node_sbus').NodeSbusEventHubAdapter;

/**
 * Map of various adapters from other AMQP-reliant libraries to the interface herein.
 */
AMQPClient.adapters = {
    'NodeSbusEventHubAdapter': EHAdapter
};

var PolicyBase      = require('./lib/policies/policy_base'),
    EHPolicy        = require('./lib/policies/event_hub_policy');

AMQPClient.policies = {
    'PolicyBase': PolicyBase,
    'EventHubPolicy': EHPolicy
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
    this.policy.connectPolicy.options.hostname = address.host;
    var sasl = address.user ? new Sasl() : null;
    this._connection = new Connection(this.policy.connectPolicy);
    this._connection.on(Connection.Connected, function (c) {
        debug('Connected');
        self._session = new Session(c);
        self._session.on(Session.Mapped, function (s) {
           cb(self);
        });
        self._session.begin(self.policy.sessionPolicy);
    });
    this._connection.on(Connection.ErrorReceived, function (e) {
        cb(self, e);
    });
    this._connection.open(address, sasl);
};

AMQPClient.prototype.send = function(msg, target, cb) {
    var message = new M.Message();
    var enc = this.policy.senderLinkPolicy.encoder;
    message.body.push(enc ? enc(msg) : msg);
    var self = this;
    var errHandler = function(e) {
        cb(null, e);
    };
    var sender = function(_link) {
        if (_link.canSend()) {
            var curId = self._sendMsgId++;
            debug('Sending ' + msg);
            _link.sendMessage(message, {deliveryTag: new Buffer([curId])});
            _link.removeListener(Link.ErrorReceived, errHandler);
            _link.removeListener(Link.CreditChange, sender);
            cb(msg);
        }
    };
    if (this._sendLinks[target]) {
        var link = this._sendLinks[target];
        if (link.canSend()) {
            sender(link);
        } else {
            l.on(Link.ErrorReceived, errHandler);
            link.on(Link.CreditChange, function(_l) {
                sender(_l);
            });
        }
    } else {
        var linkPolicy = u.deepMerge({ options: {
            name: target,
            source: { address: 'localhost' },
            target: { address: target }
        } }, this.policy.senderLinkPolicy);
        this._session.on(Session.LinkAttached, function (l) {
            if (l.name === target) {
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

AMQPClient.prototype.receive = function(source, cb) {
    var self = this;
    if (this._receiveLinks[source]) {
        var link = this._receiveLinks[source];
        debug('Already established Rx Link on ' + source);
    } else {
        var linkPolicy = u.deepMerge({ options: {
            name: source,
            source: { address: source },
            target: { address: 'localhost' }
        } }, this.policy.receiverLinkPolicy);
        this._session.on(Session.LinkAttached, function (l) {
            if (l.name === source) {
                self._receiveLinks[source] = l;
                l.on(Link.MessageReceived, function (m) {
                    var payload = m.body[0];
                    var decoded = l.policy.decoder ? l.policy.decoder(payload) : payload;
                    debug('Received ' + decoded + ' from ' + source);
                    cb(decoded);
                });
            }
        });
        this._session.attachLink(linkPolicy);
    }
};

module.exports = AMQPClient;
