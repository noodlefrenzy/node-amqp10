'use strict';
var types = require('./index'),
    Message = module.exports = {};

Message.Header = types.defineComposite({
  name: 'header', code: 0x70,
  fields: [
    { name: 'durable', type: 'boolean', default: false },
    { name: 'priority', type: 'ubyte', default: 4 },
    { name: 'ttl', type: 'milliseconds' },
    { name: 'firstAcquirer', type: 'boolean', default: false },
    { name: 'deliveryCount', type: 'uint', default: 0 }
  ]
});

Message.DeliveryAnnotations = {}; // map
Message.MessageAnnotations = {};  // map

Message.Properties = types.defineComposite({
  name: 'properties', code: 0x73,
  fields: [
    { name: 'messageId', type: '*' },
    { name: 'userId', type: 'binary' },
    { name: 'to', type: 'string' },
    { name: 'subject', type: 'string' },
    { name: 'replyTo', type: 'string' },
    { name: 'correlationId', type: '*' },
    { name: 'contentType', type: 'symbol' },
    { name: 'contentEncoding', type: 'symbol' },
    { name: 'absoluteExpiryTime', type: 'timestamp' },
    { name: 'creationTime', type: 'timestamp' },
    { name: 'groupId', type: 'string' },
    { name: 'groupSequence', type: 'sequence-no' },
    { name: 'replyToGroupId', type: 'string' }
  ]
});

Message.ApplicationProperties = {}; // map
Message.Data = {}; // binary
Message.AMQPSequence = {}; // list
Message.AMQPValue = {}; // *
Message.Footer = {}; // annotations


