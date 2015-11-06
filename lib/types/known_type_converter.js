'use strict';

var AMQPError = require('./amqp_error'),
    DeliveryStates = require('./delivery_state'),
    Source = require('./source_target').Source,
    Target = require('./source_target').Target,
    Message = require('./message');

var knownTypes = [
  AMQPError, Source, Target, DeliveryStates.Accepted,
  DeliveryStates.Received, DeliveryStates.Rejected, DeliveryStates.Released,
  Message.Header, Message.DeliveryAnnotations, Message.Annotations,
  Message.Properties, Message.ApplicationProperties, Message.Footer,
  Message.Data, Message.AMQPSequence, Message.AMQPValue
];

function convertType(describedType) {
  var descriptorStr = describedType.descriptor.toString();
  var _len = knownTypes.length;
  for (var _i = 0; _i < _len; ++_i) {
    if (knownTypes[_i].prototype.Descriptor.name.toString() === descriptorStr ||
        knownTypes[_i].prototype.Descriptor.code.toString() === descriptorStr) {
      return knownTypes[_i].fromDescribedType(describedType);
    }
  }

  return undefined;
}

module.exports = convertType;
