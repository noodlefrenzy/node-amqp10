'use strict';
var types = require('../types'),
    DeliveryState = module.exports = {};

DeliveryState.Received = types.defineComposite({
  name: 'received', code: 0x23,
  fields: [
    { name: 'sectionNumber', type: 'uint', mandatory: true },
    { name: 'sectionOffset', type: 'ulong', mandatory: true }
  ]
});

DeliveryState.Accepted = types.defineComposite({
  name: 'accepted', code: 0x24, fields: []
});

DeliveryState.Rejected = types.defineComposite({
  name: 'rejected', code: 0x25,
  fields: [
    { name: 'error', type: 'error' }
  ]
});

DeliveryState.Released = types.defineComposite({
  name: 'released', code: 0x26, fields: []
});

DeliveryState.Modified = types.defineComposite({
  name: 'modified', code: 0x27,
  fields: [
    { name: 'deliveryFailed', type: 'boolean' },
    { name: 'undeliverableHere', type: 'boolean' },
    { name: 'messageAnnotations', type: 'fields' }
  ]
});
