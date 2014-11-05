var debug           = require('debug')('amqp10-KnownTypeConverter'),

    DescribedType   = require('./described_type'),

    AMQPError       = require('./amqp_error');

function convertType(describedType) {
    switch (describedType.descriptor.toString()) {
        case AMQPError.Descriptor.toString():
            debug('Converting '+JSON.stringify(describedType)+' to AMQPError');
            return AMQPError.fromDescribedType(describedType);

        default:
            debug('Unable to match ' + describedType.descriptor.toString() + ' to any known type');
    }

    return undefined;
}

module.exports = convertType;