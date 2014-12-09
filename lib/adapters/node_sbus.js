var EventEmitter        = require('events').EventEmitter,
    util                = require('util'),

    AMQPClient          = require('../../amqp_client'),

    Connection          = require('../connection'),
    Sasl                = require('../sasl'),
    Session             = require('../session').Session,
    Link                = require('../session').Link,

    DescribedType       = require('../types/described_type'),
    Symbol              = require('../types/symbol'),
    Source              = require('../types/source_target').Source,
    Target              = require('../types/source_target').Target,

    DefaultEHPolicy     = require('../policies/event_hub_policy').DefaultEventHubPolicy;

/**
 * Adapts node-amqp-1-0 to adhere to the interface defined by the node-sbus adapter,
 * for EventHub support.  Defines "subscribe" and "message" events, and builds
 * a messenger.
 *
 * @constructor
 */
function NodeSbusEventHubAdapter(policy) {
    NodeSbusEventHubAdapter.super_.call(this);
    this.policy = policy || DefaultEHPolicy;
    this._connections = {};
    this._sessions = {};
    this._linksByUri = {};
}

util.inherits(NodeSbusEventHubAdapter, EventEmitter);

// Events expected by node-sbus
NodeSbusEventHubAdapter.Subscribed = 'subscribed';
NodeSbusEventHubAdapter.MessageReceived = 'message';

NodeSbusEventHubAdapter.prototype.subscribe = function(uri, options) {
    // Parse out core URI
    var parsed = NodeSbusEventHubAdapter.ParseAddress(uri);
    this.policy.connectPolicy.options.hostname = parsed.host;
    var self = this;
    var conn;
    if (!this._connections[parsed.connectionKey]) {
        conn = new Connection(this.policy.connectPolicy);
        this._connections[parsed.connectionKey] = conn;
        conn.on(Connection.Connected, function(c) {
            self._beginSession(parsed, c, options);
        });
        conn.open(parsed, new Sasl());
    } else {
        conn = this._connections[parsed.connectionKey];
        if (!this._sessions[parsed.sessionKey]) {
            this._beginSession(parsed, conn, options);
        } else {
            this._createLink(parsed, this._sessions[parsed.sessionKey], options);
        }
    }
};

NodeSbusEventHubAdapter.prototype._beginSession = function(parsedUri, conn, options) {
    var self = this;
    var session = new Session(conn);
    this._sessions[parsedUri.sessionKey] = session;
    session.on(Session.Mapped, function (s) {
        self._createLink(parsedUri, s, options);
    });
    session.begin(this.policy.sessionPolicy);
};

NodeSbusEventHubAdapter.prototype._createLink = function(parsedUri, session, options) {
    var linkParams = u.orDefaults(this.policy.linkPolicy.options, {
        name: parsedUri.path,
        role: constants.linkRole.receiver,
        source: new Source({
            address: parsedUri.path
        }),
        target: new Target({
            address: 'localhost'
        })
    });
    if (options && options.sourceFilter) {
        // Map source filter to our types.
        linkParams.source.filter = {};
        for (var idx = 0; idx < options.sourceFilter.length; idx += 2) {
            var k = options.sourceFilter[idx];
            var v = options.sourceFilter[idx+1];
            linkParams.source.filter[this._mapType(k)] = this._mapType(v);
        }
    }
    var self = this;
    session.on(Session.LinkAttached, function (l) {
        if (l.name === parsedUri.path) {
            l.on(Link.MessageReceived, function (m) {
                self._receiveMessage(m, parsedUri.uri);
            });
            self.emit(NodeSbusEventHubAdapter.Subscribed, parsedUri.uri);
        }
    });
    var link = session.attachLink(linkParams);
};

NodeSbusEventHubAdapter.prototype._receiveMessage = function(message, uri) {
    var outMsg = {};
    if (message.annotations && message.annotations.value) {
        outMsg.annotations = ['map', []];
        for (var key in message.annotations.value) {
            outMsg.annotations[1].push(this._unmapType(key));
            outMsg.annotations[1].push(this._unmapType(message.annotations.value[key]));
        }
    }
    outMsg.body = message.body;
    outMsg.properties = message.properties;
    this.emit(NodeSbusEventHubAdapter.MessageReceived, outMsg);
};

NodeSbusEventHubAdapter.prototype._mapType = function(typeval) {
    var type = typeval[0];
    switch (type) {
        case 'string': return typeval[1];
        case 'symbol': return new Symbol(typeval[1]);
        case 'described': return new DescribedType(this._mapType(typeval[1]), this._mapType(typeval[2]));
    }
};

NodeSbusEventHubAdapter.prototype._unmapType = function(val) {
    if (val instanceof Symbol) {
        return [ 'symbol', val.contents ];
    } else if (val instanceof DescribedType) {
        return [ 'described', this._unmapType(val.descriptor), this._unmapType(val.value) ];
    } else if (typeof val === 'string') {
        return [ 'string', val ];
    } else {
        throw new Error('Unsupported unmap of ' + val);
    }
};

NodeSbusEventHubAdapter.prototype.receive = function() {
    // Nothing to do here.
};

NodeSbusEventHubAdapter.ParseAddress = function(address) {
    var parsed = AMQPClient.ParseAddress(address);
    parsed.uri = address;
    parsed.path = parsed.path.substr(1);
    var ehNameEndIdx = parsed.path.indexOf('/');
    if (ehNameEndIdx > 0) {
        parsed.eventHubName = parsed.path.substr(0, ehNameEndIdx);
        parsed.subpath = parsed.path.substr(ehNameEndIdx+1);
        parsed.connectionKey = parsed.host + '-' + parsed.eventHubName;
        parsed.sessionKey = parsed.connectionKey + '-' + parsed.subpath;
    } else {
        throw new Error('Failed to parse EventHub details from '+address);
    }

    return parsed;
};

module.exports.NodeSbusEventHubAdapter = NodeSbusEventHubAdapter;
