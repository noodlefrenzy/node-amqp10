'use strict';
var types = require('../types');

function defineDeliveryState(definition) {
  var DeliveryState = types.defineComposite(definition);
  // terminus[definition.name] = DeliveryState;
  // by_descriptor[Terminus.descriptor.code] = Terminus;
  // by_descriptor[c.descriptor.symbolic] = Terminus;
  return DeliveryState;
}

var Received = defineDeliveryState({
  name: 'received', code: 0x23,
  fields: [
    { name: 'sectionNumber', type: 'uint', mandatory: true },
    { name: 'sectionOffset', type: 'ulong', mandatory: true }
  ]
});

var Accepted = defineDeliveryState({
  name: 'accepted', code: 0x24, fields: []
});

var Rejected = defineDeliveryState({
  name: 'rejected', code: 0x25,
  fields: [
    { name: 'error', type: 'error' }
  ]
});

var Released = defineDeliveryState({
  name: 'released', code: 0x26, fields: []
});

var Modified = defineDeliveryState({
  name: 'modified', code: 0x27,
  fields: [
    { name: 'deliveryFailed', type: 'boolean' },
    { name: 'undeliverableHere', type: 'boolean' },
    { name: 'messageAnnotations', type: 'fields' }
  ]
});

module.exports = {
  Received: Received,
  Accepted: Accepted,
  Rejected: Rejected,
  Released: Released,
  Modified: Modified
};
