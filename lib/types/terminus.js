'use strict';
var defineComposite = require('./composite_type').defineComposite,
    errors = require('../errors');

var Terminus = module.exports = {};

function terminusDurability(value) {
  if (typeof value === 'number' || value instanceof Number)
    return value;

  if (value === 'configuration') return 1;
  else if (value === 'unsettled-state') return 2;
  else return 0;
}

var TerminusExpiryPolicies = [ 'link-detach', 'session-end', 'connection-close', 'never' ];
function terminusExpiryPolicy(value) {
  if (TerminusExpiryPolicies.indexOf(value) === -1)
    throw new errors.EncodingError(value, 'invalid terminus expiry policy');
  return value;
}

function distributionMode(value) {
  if (value !== 'move' && value !== 'copy')
    throw new errors.EncodingError(value, 'invalid distribution mode');
  return value;
}

Terminus.Source = defineComposite({
  name: 'source', code: 0x28,
  fields: [
    { name: 'address', type: 'address' },
    { name: 'durable', type: 'uint', requires: terminusDurability, default: 'none' },
    { name: 'expiryPolicy', type: 'symbol', requires: terminusExpiryPolicy, default: 'session-end' },
    { name: 'timeout', type: 'seconds', default: 0 },
    { name: 'dynamic', type: 'boolean', default: false },
    { name: 'dynamicNodeProperties', type: 'fields', default: {} }, // @spec type: `node-properties` => `fields`
    { name: 'distributionMode', type: 'symbol', requires: distributionMode },
    { name: 'filter', type: 'fields', default: {} },  // @spec type: `filter-set` => `fields`
    { name: 'defaultOutcome', type: '*' },  // @spec type: `*`, requires: `outcome` => `deliveryState`
    { name: 'outcomes', type: 'symbol', multiple: true },
    { name: 'capabilities', type: 'symbol', multiple: true }
  ]
});

Terminus.Target = defineComposite({
  name: 'target', code: 0x29,
  fields: [
    { name: 'address', type: 'address' },
    { name: 'durable', type: 'uint', requires: terminusDurability, default: 'none' },
    { name: 'expiryPolicy', type: 'symbol', requires: terminusExpiryPolicy, default: 'session-end' },
    { name: 'timeout', type: 'seconds', default: 0 },
    { name: 'dynamic', type: 'boolean', default: false },
    { name: 'dynamicNodeProperties', type: 'fields', default: {} }, // @spec type: `node-properties` => `fields`
    { name: 'capabilities', type: 'symbol', multiple: true }
  ]
});
