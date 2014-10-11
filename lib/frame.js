var debug           = require('debug')('amqp10-Frame'),
    butils          = require('butils'),

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
    this.frameType = 'unknown';
    this.buffer = null;
};

/**
 * Populate the internal buffer with contents built based on the options.  SIZE and DOFF will be inferred
 * based on the options given.
 *
 * @param {Object} options      Following options are expected/[supported]:
 *                              - [type]: Assumed to be 0x0 - AMQP
 *                              - payload: Buffer of bytes to be sent
 *                              - [extendedHeader]: Buffer of bytes for the extended header.
 *                              AMQP-frame-specific:
 *                              - channel: Channel number
 *                              - performative: AMQP frame details
 *                              Non-AMQP-frame-specific:
 *                              - typeSpecificHeader: 2-byte integer for bytes 7 & 8 of header.
 *
 * @private
 */
Frame.prototype._buildOutgoing = function(options) {
    var type = options.type || constants.frame_type.amqp;
    var isAMQP = type == constants.frame_type.amqp;
    var extendedHeader = options.extendedHeader;
    var payload = options.payload;
    var headerSize = 8 + (extendedHeader ? extendedHeader.length : 0);
    if (headerSize % 4 !== 0) throw new MalformedHeaderError('Header size '+headerSize+' not cleanly divisible by 4');
    var size = headerSize + payload.length;
    var doff = headerSize / 4;
    var typeSpecificHeader = 0x0;
    if (isAMQP) {
        size += 4; // Add space for performative
        typeSpecificHeader = options.channel;
    } else {
        typeSpecificHeader = options.typeSpecificHeader;
    }

    this.buffer = new Buffer(size);
    var curOffset = 0;
    butils.writeInt32(this.buffer, size, curOffset); curOffset += 4;
    butils.writeInt(this.buffer, doff, curOffset); curOffset++;
    butils.writeInt(this.buffer, type, curOffset); curOffset++;
    this.buffer.writeInt16BE(typeSpecificHeader, curOffset); curOffset += 2;
    if (extendedHeader && extendedHeader.length) {
        extendedHeader.copy(this.buffer, curOffset); curOffset += extendedHeader.length;
    }

    if (isAMQP) {
        var frameDetails = options.performative;
        if (!frameDetails || !frameDetails.length) throw new MalformedHeaderError('Bad AMQP performative - no data');
        frameDetails.copy(this.buffer, curOffset); curOffset += frameDetails.length;
    }

    if (payload && payload.length) {
        payload.copy(this.buffer, curOffset); curOffset += payload.length;
    }

    debug('Built frame ['+this.buffer.toString('hex')+'] of length '+curOffset+' (size= '+size+')');
};

module.exports = Frame;