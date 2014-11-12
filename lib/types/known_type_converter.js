var debug           = require('debug')('amqp10-KnownTypeConverter'),

    DescribedType   = require('./described_type'),

    AMQPError       = require('./amqp_error'),
    DeliveryStates  = require('./delivery_state');

function convertType(describedType) {
    switch (describedType.descriptor.toString()) {
        case AMQPError.Descriptor.name.toString():
        case AMQPError.Descriptor.code.toString():
            return AMQPError.fromDescribedType(describedType);

        case DeliveryStates.Accepted.Descriptor.name.toString():
        case DeliveryStates.Accepted.Descriptor.code.toString():
            return DeliveryStates.Accepted.fromDescribedType(describedType);

        case DeliveryStates.Received.Descriptor.name.toString():
        case DeliveryStates.Received.Descriptor.code.toString():
            return DeliveryStates.Received.fromDescribedType(describedType);

        case DeliveryStates.Rejected.Descriptor.name.toString():
        case DeliveryStates.Rejected.Descriptor.code.toString():
            return DeliveryStates.Rejected.fromDescribedType(describedType);

        case DeliveryStates.Released.Descriptor.name.toString():
        case DeliveryStates.Released.Descriptor.code.toString():
            return DeliveryStates.Released.fromDescribedType(describedType);

        default:
            debug('Unable to match ' + describedType.descriptor.toString() + ' to any known type');
    }

    return undefined;
}

module.exports = convertType;