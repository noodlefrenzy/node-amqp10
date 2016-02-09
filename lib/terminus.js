'use strict';
var types = require('./types.js');
var terminus = module.exports = {};

function defineTerminus(definition) {
  var Terminus = types.defineComposite(definition);
  terminus[definition.name] = Terminus;
  // by_descriptor[Terminus.descriptor.code] = Terminus;
  // by_descriptor[c.descriptor.symbolic] = Terminus;
}

defineTerminus({
  name: 'source', code: 0x28,
  fields: [
    { name: 'address', type: 'string' },
    { name: 'durable', type: 'uint', default: 0 },
    { name: 'expiryPolicy', type: 'symbol', default: 'session-end' },
    { name: 'timeout', type: 'uint', default: 0 },
    { name: 'dynamic', type: 'boolean', default: false },
    { name: 'dynamicNodeProperties', type: 'fields', default: {} },
    { name: 'distributionMode', type: 'symbol' },
    { name: 'filter', type: 'fields', default: {} },
    { name: 'defaultOutcome', type: '*' },
    { name: 'outcomes', type: 'symbol', multiple: true },
    { name: 'capabilities', type: 'symbol', multiple: true }
  ]
});

defineTerminus({
  name: 'target', code: 0x29,
  fields: [
    { name: 'address', type: 'string' },
    { name: 'durable', type: 'uint', default: 0 },
    { name: 'expiryPolicy', type: 'symbol', default: 'session-end' },
    { name: 'timeout', type: 'uint', default: 0 },
    { name: 'dynamic', type: 'boolean', default: false },
    { name: 'dynamicNodeProperties', type: 'fields', default: {} },
    { name: 'capabilities', type: 'symbol', multiple: true }
  ]
});

module.exports = terminus;