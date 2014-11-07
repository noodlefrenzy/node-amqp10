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

    codec       = require('../codec'),
    constants   = require('../constants'),
    exceptions  = require('../exceptions'),

    DescribedType   = require('../types/described_type');

function FrameReader() {
}

/**
 * For now, just process performative headers.
 * @todo Need to process the payloads as well
 * @todo Cope with Non-AMQP frames
 *
 * @param cbuf          circular buffer containing the potential frame data.
 * @returns {AMQPFrame} Frame with populated data, undefined if frame is incomplete.  Throws exception on unmatched frame.
 */
FrameReader.prototype.read = function(cbuf) {
    if (cbuf.size < 8) return undefined;

    var size = cbuf.peek(4).readUInt32BE(0);
    if (size > cbuf.size) return undefined;

    var sizeAndDoff = cbuf.read(8);
    var doff = sizeAndDoff[4];
    var frameType = sizeAndDoff[5];
    var xHeaderSize = (doff * 4) - 8;
    var payloadSize = size - (doff * 4);
    if (xHeaderSize > 0) {
        xHeaderBuf = cbuf.read(xHeaderSize);
        // @todo Process x-header
        debug('Read extended header [' + xHeaderBuf.toString('hex') + ']');
    }

    if (payloadSize > 0) {
        var payloadBuf = cbuf.read(payloadSize);
        if (frameType == constants.frameType.amqp) {
            var channel = sizeAndDoff.readUInt16BE(6); // Bytes 6 & 7 are channel
            var decoded = codec.decode(payloadBuf, 0);
            if (!decoded) throw new exceptions.MalformedPayloadError('Unable to parse frame payload [' + payloadBuf.toString('hex') + ']');
            if (!(decoded[0] instanceof DescribedType)) {
                throw new exceptions.MalformedPayloadError('Expected DescribedType from AMQP Payload, but received ' + JSON.stringify(decoded[0]));
            }
            var describedType = decoded[0];
            switch (describedType.descriptor.toString()) {
                // @todo Implement the rest of the AMQP Frames ...
                case Open.Descriptor.toString():
                    return new Open(describedType);

                case Close.Descriptor.toString():
                    return new Close(describedType);

                case Begin.Descriptor.toString():
                    var beginFrame = new Begin(describedType);
                    beginFrame.channel = channel;
                    return beginFrame;

                case End.Descriptor.toString():
                    var endFrame = new End(describedType);
                    endFrame.channel = channel;
                    return endFrame;

                default:
                    debug('Failed to match descriptor ' + describedType.descriptor.toString());
                    break;
            }
            throw new exceptions.MalformedPayloadError('Failed to match AMQP performative ' + describedType.descriptor.toString());
        } else {
            throw new exceptions.NotImplementedError("We don't handle non-AMQP frames yet.");
        }
    }

    throw new exceptions.MalformedPayloadError('Failed to match');
};

module.exports = new FrameReader();
