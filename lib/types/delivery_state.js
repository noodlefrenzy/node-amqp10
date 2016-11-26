'use strict';
var defineComposite = require('./composite_type').defineComposite;
var DeliveryState = module.exports = {};

DeliveryState.Received = defineComposite({
  name: 'received', code: 0x23,
  fields: [
    { name: 'sectionNumber', type: 'uint', mandatory: true },
    { name: 'sectionOffset', type: 'ulong', mandatory: true }
  ]
});

DeliveryState.Accepted = defineComposite({
  name: 'accepted', code: 0x24, fields: []
});

DeliveryState.Rejected = defineComposite({
  name: 'rejected', code: 0x25,
  fields: [
    { name: 'error', type: 'error' }
  ]
});

DeliveryState.Released = defineComposite({
  name: 'released', code: 0x26, fields: []
});

DeliveryState.Modified = defineComposite({
  name: 'modified', code: 0x27,
  fields: [
    { name: 'deliveryFailed', type: 'boolean' },
    { name: 'undeliverableHere', type: 'boolean' },
    { name: 'messageAnnotations', type: 'fields' }
  ]
});
