'use strict';
var types = require('../types'),
    Terminus = module.exports = {};

Terminus.Source = types.defineComposite({
  name: 'source', code: 0x28,
  fields: [
    { name: 'address', type: 'address' },
    { name: 'durable', type: 'uint', default: 0 },  // @spec type: `terminus-durability` => `uint` choice
    { name: 'expiryPolicy', type: 'symbol', default: 'session-end' }, // @spec type: `terminus-expiry-policy` => `symbol` choice
    { name: 'timeout', type: 'seconds', default: 0 },
    { name: 'dynamic', type: 'boolean', default: false },
    { name: 'dynamicNodeProperties', type: 'fields', default: {} }, // @spec type: `node-properties` => `fields`
    { name: 'distributionMode', type: 'symbol' }, // @spec type: `symbol`, requires: `distributionMode`
    { name: 'filter', type: 'fields', default: {} },  // @spec type: `filter-set` => `fields`
    { name: 'defaultOutcome', type: '*' },  // @spec type: `*`, requires: `outcome` => `deliveryState`
    { name: 'outcomes', type: 'symbol', multiple: true },
    { name: 'capabilities', type: 'symbol', multiple: true }
  ]
});

Terminus.Target = types.defineComposite({
  name: 'target', code: 0x29,
  fields: [
    { name: 'address', type: 'address' },
    { name: 'durable', type: 'uint', default: 0 },  // @spec type: `terminus-durability` => `uint` choice
    { name: 'expiryPolicy', type: 'symbol', default: 'session-end' }, // @spec type: `terminus-expiry-policy` => `symbol` choice
    { name: 'timeout', type: 'seconds', default: 0 },
    { name: 'dynamic', type: 'boolean', default: false },
    { name: 'dynamicNodeProperties', type: 'fields', default: {} }, // @spec type: `node-properties` => `fields`
    { name: 'capabilities', type: 'symbol', multiple: true }
  ]
});
