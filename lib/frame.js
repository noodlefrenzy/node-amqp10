var debug           = require('debug')('amqp10-Frame'),
    butils          = require('butils'),
    builder         = require('buffer-builder'),
    util            = require('util'),

    codec           = require('./codec'),
    constants       = require('./constants'),
    exceptions      = require('./exceptions');

/**
 * Encapsulates all convenience methods required for encoding a frame to put it out on the wire, and decoding an
 * incoming frame.
 *
 * Frames look like:
 * <pre>
             +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |---> Frame Header
      4 |  DOFF  |  TYPE  | <TYPE-SPECIFIC> |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |---> Extended Header
        .          <TYPE-SPECIFIC>          .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |                                   |  |
        .                                   .  |
        .                                   .  |
        .                                   .  |
        .          <TYPE-SPECIFIC>          .  |---> Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .                                   .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

 </pre>
 * @constructor
 */
var Frame = function() {
    this.frameType = undefined;
};

Frame.prototype._getTypeSpecificHeader = function(options) {
    throw new exceptions.NotImplementedError('Subclass must override _getTypeSpecificHeader');
};

Frame.prototype._writeExtendedHeader = function(bufBuilder, options) {
    throw new exceptions.NotImplementedError('Subclass must override _writeExtendedHeader');
};

Frame.prototype._writePayload = function(bufBuilder, options) {
    throw new exceptions.NotImplementedError('Subclass must override _writePayload');
};

/**
 * Populate the internal buffer with contents built based on the options.  SIZE and DOFF will be inferred
 * based on the options given.
 *
 *
 * @private
 */
Frame.prototype._buildOutgoing = function(options) {
    var isAMQP = this.frameType == constants.frame_type.amqp;
    var bufBuilder = new builder();
    bufBuilder.appendUInt32BE(0); // Size placeholder
    // DOFF placeholder(8) | type(8) | type-specific(16)
    var doffHeader = ((this.frameType & 0xFF) << 16) & (this._getTypeSpecificHeader() & 0xFFFF);
    bufBuilder.appendUInt32BE(doffHeader);
    var extHeaderSize = this._writeExtendedHeader(bufBuilder, options);
    this._writePayload(bufBuilder, options);
    var buf = bufBuilder.get();
    var headerSize = 8 + extHeaderSize;
    var size = buf.length;
    var doff = headerSize / 4;
    // Now that we know size and DOFF, fill in the blanks.
    buf.writeUInt32BE(size, 0);
    buf.writeUInt8(doff, 4);

    debug('Built frame ['+buf.toString('hex')+'] of length '+curOffset+' (size= '+size+')');
    return buf;
};

Frame.prototype.write = function(outStream) {
    var outbuf = this._buildOutgoing();
    /** @todo Verify stream API */
    outStream.write(outbuf);
};

Frame.prototype.read = function(inStream) {
    throw new exceptions.NotImplementedError('Subclass must implement read');
};

module.exports.Frame = Frame;

/**
 * AMQP Frames are slight variations on the one above, with the first part of the payload taken up
 * by the AMQP <i>performative</i> (details of the specific frame type).  For some frames, that's the entire payload.
 *
<pre>
      +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |---> Frame Header
      4 |  DOFF  |  TYPE  |     CHANNEL     |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |---> Extended Header
        .             <IGNORED>             .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |           PERFORMATIVE:           |  |
        .      Open / Begin / Attach        .  |
        .   Flow / Transfer / Disposition   .  |
        .      Detach / End / Close         .  |
        |-----------------------------------|  |
        .                                   .  |---> Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .             PAYLOAD               .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

</pre>
 * @constructor
 */
var AMQPFrame = function() {
    this.frameType = constants.frame_type.amqp;
    this.channel = 0;
    this.performative = undefined;
    this.payload = undefined;
};

AMQPFrame.prototype._getTypeSpecificHeader = function(options) {
    return this.channel;
};

AMQPFrame.prototype._writeExtendedHeader = function(bufBuilder, options) {
    return 0; // AMQP doesn't use the extended header.
};

AMQPFrame.prototype._writePayload = function(bufBuilder, options) {
    codec.encode(this.performative, bufBuilder);
    if (this.payload !== undefined) {
        codec.encode(this.payload, bufBuilder);
    }
};

util.inherits(AMQPFrame, Frame);

module.exports.AMQPFrame = AMQPFrame;