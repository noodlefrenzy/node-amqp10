var EventEmitter        = require('events').EventEmitter,
    util                = require('util'),

    AMQPClient          = require('../../amqp_client'),

    Connection          = require('../connection'),
    Session             = require('../session').Session,
    Link                = require('../session').Link,

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

NodeSbusEventHubAdapter.prototype.subscribe = function(uri, options) {
    // Parse out core URI
    var parsed = NodeSbusEventHubAdapter.ParseAddress(uri);
    var key = parsed.host + parsed.eventHubName;
    if (!this._connections[key]) {
        this._connections[key] = new Connection(this.policy.connectPolicy);
    }
    // If connection doesn't exist for that core URI, create it
    //      On connect, create the session
    //      On map, create the link
    // Else
    //      create the link
    // On link, trigger subscribed event.
    // Ensure message received event gets mapped.
};

NodeSbusEventHubAdapter.prototype.receive = function() {
    // Nothing to do here.
};

NodeSbusEventHubAdapter.ParseAddress = function(address) {
    var parsed = AMQPClient.ParseAddress(address);
    var path = parsed.path.substr(1);
    var ehNameEndIdx = path.indexOf('/');
    if (ehNameEndIdx > 0) {
        parsed.eventHubName = path.substr(0, ehNameEndIdx);
        parsed.path = path.substr(ehNameEndIdx+1);
    } else {
        throw new Error('Failed to parse EventHub details from '+address);
    }

    return parsed;
};

module.exports.NodeSbusEventHubAdapter = NodeSbusEventHubAdapter;
