'use strict';

var util = require('util'),

    constants = require('../constants'),
    u = require('../utilities'),

    AMQPFields = require('./amqp_composites').Fields,
    DescribedType = require('./described_type'),
    ForcedType = require('./forced_type');

function Source(options) {
  Source.super_.call(this, Source);
  options = options || {};
  this.address = u.orNull(options.address);
  this.durable = u.onUndef(options.durable, constants.terminusDurability.none);
  this.expiryPolicy = u.onUndef(options.expiryPolicy, constants.terminusExpiryPolicy.sessionEnd);
  this.timeout = u.onUndef(options.timeout, 0);
  this.dynamic = u.onUndef(options.dynamic, false);
  this.dynamicNodeProperties = options.dynamicNodeProperties;
  this.distributionMode = options.distributionMode;
  this.filter = options.filter;
  this.defaultOutcome = options.defaultOutcome;
  this.outcomes = options.outcomes;
  this.capabilities = options.capabilities;
}

util.inherits(Source, DescribedType);

Source.prototype.Descriptor = { code: 0x28, name: 'amqp:source:list' };
Source.prototype.EncodeOrdering = [
  'address', 'durable', 'expiryPolicy', 'timeout', 'dynamic',
  'dynamicNodeProperties', 'distributionMode', 'filter', 'defaultOutcome',
  'outcomes', 'capabilities'
];

Source.fromDescribedType = function(describedType) {
  var options = {};
  u.assignFromDescribedType(Source, describedType, options, {
    durable: constants.terminusDurability.none,
    expiryPolicy: constants.terminusExpiryPolicy.sessionEnd,
    timeout: 0,
    dynamic: false
  });

  return new Source(options);
};

Source.prototype.getValue = function() {
  var self = this;
  return {
    address: self.address,
    durable: new ForcedType('uint', u.onUndef(self.durable, constants.terminusDurability.none)),
    expiryPolicy: u.onUndef(self.expiryPolicy, constants.terminusExpiryPolicy.sessionEnd),
    timeout: new ForcedType('uint', u.onUndef(self.timeout, 0)),
    dynamic: u.onUndef(self.dynamic, false),
    dynamicNodeProperties: u.onUndef(self.dynamicNodeProperties, {}),
    distributionMode: self.distributionMode,
    filter: u.coerce(u.onUndef(self.filter, {}), AMQPFields),
    defaultOutcome: u.orNull(self.defaultOutcome),
    outcomes: u.orNull(self.outcomes),
    capabilities: u.orNull(self.capabilities),
    encodeOrdering: Source.prototype.EncodeOrdering
  };
};

module.exports.Source = Source;

function Target(options) {
  Target.super_.call(this, Target);
  options = options || {};
  this.address = u.orNull(options.address);
  this.durable = u.onUndef(options.durable, constants.terminusDurability.none);
  this.expiryPolicy = u.onUndef(options.expiryPolicy, constants.terminusExpiryPolicy.sessionEnd);
  this.timeout = u.onUndef(options.timeout, 0);
  this.dynamic = u.onUndef(options.dynamic, false);
  this.dynamicNodeProperties = options.dynamicNodeProperties;
  this.capabilities = options.capabilities;
}

util.inherits(Target, DescribedType);

Target.prototype.Descriptor = { code: 0x29, name: 'amqp:target:list' };
Target.prototype.EncodeOrdering = [
  'address', 'durable', 'expiryPolicy', 'timeout', 'dynamic',
  'dynamicNodeProperties', 'capabilities'
];

Target.fromDescribedType = function(describedType) {
  var options = {};
  u.assignFromDescribedType(Target, describedType, options, {
    durable: constants.terminusDurability.none,
    expiryPolicy: constants.terminusExpiryPolicy.sessionEnd,
    timeout: 0,
    dynamic: false,
    dynamicNodeProperties: {}
  });

  return new Target(options);
};

Target.prototype.getValue = function() {
  var self = this;
  return {
    address: u.orNull(self.address),
    durable: new ForcedType('uint', u.onUndef(self.durable, constants.terminusDurability.none)),
    expiryPolicy: u.onUndef(self.expiryPolicy, constants.terminusExpiryPolicy.sessionEnd),
    timeout: new ForcedType('uint', u.onUndef(self.timeout, 0)),
    dynamic: u.onUndef(self.dynamic, false),
    dynamicNodeProperties: u.onUndef(self.dynamicNodeProperties, {}),
    capabilities: u.orNull(self.capabilities),
    encodeOrdering: Target.prototype.EncodeOrdering
  };
};

module.exports.Target = Target;
