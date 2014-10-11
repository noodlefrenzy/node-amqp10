var debug       = require('debug')('amqp10-open_frame'),
    util        = require('util'),

    constants   = require('./constants'),
    Frame       = require('./frame');

var OpenFrame = function() {

};

/**
* @param {Object} options      Following options are expected/[supported]:
*                              - [type]: Assumed to be 0x0 - AMQP
    *                              - payload: Buffer of bytes to be sent
*                              - [extendedHeader]: Buffer of bytes for the extended header.
    *                              AMQP-frame-specific:
*                              - channel: Channel number
*                              - frameType: Frame type ("performative" in AMQP-speak)
*                              Non-AMQP-frame-specific:
*                              - typeSpecificHeader: 2-byte integer for bytes 7 & 8 of header.
 */
OpenFrame.prototype.outgoing = function() {
    this._buildOutgoing({ channel: 0x0, frameType: constants.frame_type.open });
};

util.inherits(OpenFrame, Frame);