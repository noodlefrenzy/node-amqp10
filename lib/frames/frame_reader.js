var debug       = require('debug')('amqp10-FrameReader'),

    Attach      = require('./attach_frame'),
    Begin       = require('./begin_frame'),
    Close       = require('./close_frame'),
    Detach      = require('./detach_frame'),
    Disposition = require('./disposition_frame'),
    End         = require('./end_frame'),
    Flow        = require('./flow_frame'),
    Open        = require('./open_frame'),
    Transfer    = require('./transfer_frame'),

    DescribedType   = require('../types/described_type');

var FrameReader = function() {
};

/**
 * For now, just process performative headers.
 * @todo Need to process the payloads as well
 * @todo Cope with Non-AMQP frames
 *
 * @param {DescribedType} describedType Details the performative, will match on descriptor
 * @returns {AMQPFrame} Frame with populated data, or null on a miss
 */
FrameReader.prototype.read = function(describedType) {
    var frame = null;
    switch (describedType.descriptor.toString()) {
        // @todo Implement the rest of the AMQP Frames ...
        case Open.Descriptor.toString():
            frame = new Open();
            frame.readPerformative(describedType);
            break;

        default:
            debug('Failed to match descriptor ' + describedType.descriptor.toString());
            break;
    }

    return frame;
};

module.exports = FrameReader;
