var Int64           = require('node-int64'),
    util            = require('util'),

    constants       = require('../constants'),
    exceptions      = require('../exceptions'),

    AMQPError       = require('./amqp_error'),
    DescribedType   = require('./described_type'),
    ForcedType      = require('./forced_type'),
    Symbol          = require('./symbol');

function Source(options) {
    Source.super_.call(this, Source.Descriptor.code);
    this.address = options.address || null;
    this.durable = options.durable || constants.terminusDurability.none;
    this.expiryPolicy = options.expiryPolicy || constants.terminusExpiryPolicy.sessionEnd;
    this.timeout = options.timeout || 0;
    this.dynamic = options.dynamic || false;
    this.dynamicNodeProperties = options.dynamicNodeProperties || {};
    this.distributionMode = options.distributionMode || null;
    this.filter = options.filter || {};
    this.defaultOutcome = options.defaultOutcome || null;
    this.outcomes = options.outcomes || [];
    this.capabilities = options.capabilities || [];
}

util.inherits(Source, DescribedType);

Source.Descriptor = {
    name: new Symbol('amqp:source:list'),
    code: new Int64(0x0, 0x28)
};

Source.fromDescribedType = function(describedType) {
    var sourceArr = describedType.value;
    var idx = 0;
    var options = {
        address : sourceArr[idx++],
        durable: sourceArr[idx++],
        expiryPolicy: sourceArr[idx++],
        timeout: sourceArr[idx++],
        dynamic: sourceArr[idx++],
        dynamicNodeProperties: sourceArr[idx++],
        distributionMode: sourceArr[idx++],
        filter: sourceArr[idx++],
        defaultOutcome: sourceArr[idx++],
        outcomes: sourceArr[idx++],
        capabilities: sourceArr[idx++]
    };
    return new Source(options);
};

Source.prototype.getValue = function() {
    var self = this;
    return {
        address: self.address,
            durable: new ForcedType('uint', self.durable === undefined ? constants.terminusDurability.none : self.durable),
        expiryPolicy: self.expiryPolicy === undefined ? constants.terminusExpiryPolicy.sessionEnd : self.expiryPolicy,
        timeout: new ForcedType('uint', self.timeout || 0),
        dynamic: self.dynamic || false,
        dynamicNodeProperties: self.dynamicNodeProperties || {},
        distributionMode: self.distributionMode || null,
        filter: self.filter || {},
        defaultOutcome: self.defaultOutcome || null,
        outcomes: self.outcomes || null,
        capabilities: self.capabilities || null,
        encodeOrdering: ['address', 'durable', 'expiryPolicy', 'timeout', 'dynamic', 'dynamicNodeProperties',
            'distributionMode', 'filter', 'defaultOutcome', 'outcomes', 'capabilities']
    };
};

module.exports.Source = Source;

function Target(options) {
    Target.super_.call(this, Target.Descriptor.code);
    this.address = options.address || null;
    this.durable = options.durable || constants.terminusDurability.none;
    this.expiryPolicy = options.expiryPolicy || constants.terminusExpiryPolicy.sessionEnd;
    this.timeout = options.timeout || 0;
    this.dynamic = options.dynamic || false;
    this.dynamicNodeProperties = options.dynamicNodeProperties || {};
    this.capabilities = options.capabilities || [];
}

util.inherits(Target, DescribedType);

Target.Descriptor = {
    name: new Symbol('amqp:target:list'),
    code: new Int64(0x0, 0x29)
};

Target.fromDescribedType = function(describedType) {
    var targetArr = describedType.value;
    var idx = 0;
    var options = {
        address: targetArr[idx++] || null,
        durable: targetArr[idx++] || constants.terminusDurability.none,
        expiryPolicy: targetArr[idx++] || constants.terminusExpiryPolicy.sessionEnd,
        timeout: targetArr[idx++] || 0,
        dynamic: targetArr[idx++] || false,
        dynamicNodeProperties: targetArr[idx++] || {},
        capabilities: targetArr[idx++] || []
    };
    return new Target(options);
};

Target.prototype.getValue = function() {
    var self = this;
    return {
        address: self.address,
        durable: new ForcedType('uint', self.durable === undefined ? constants.terminusDurability.none : self.durable),
        expiryPolicy: self.expiryPolicy === undefined ? constants.terminusExpiryPolicy.sessionEnd : self.expiryPolicy,
        timeout: new ForcedType('uint', self.timeout || 0),
        dynamic: self.dynamic || false,
        dynamicNodeProperties: self.dynamicNodeProperties || {},
        capabilities: self.capabilities || null,
        encodeOrdering: ['address', 'durable', 'expiryPolicy', 'timeout', 'dynamic', 'dynamicNodeProperties', 'capabilities']
    };
};

module.exports.Target = Target;