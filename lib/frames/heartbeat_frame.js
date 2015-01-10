var util            = require('util'),

    FrameBase       = require('./frame');

/**
 * Heartbeat frames are under-specified in the AMQP Specification as "an empty frame".  In practice, this
 * seems to be interpreted as a an empty header with a type of 0 (or 8 zero bytes).
 *
 * @constructor
 */
function HeartbeatFrame() {
    HeartbeatFrame.super_.call(this, 0);
    return this;
}

util.inherits(HeartbeatFrame, FrameBase.Frame);
module.exports = HeartbeatFrame;

HeartbeatFrame.prototype._getTypeSpecificHeader = function (options) {
    return 0;
};

HeartbeatFrame.prototype._writeExtendedHeader = function (bufBuilder, options) {
    return 0;
};

HeartbeatFrame.prototype._writePayload = function (bufBuilder, options) {
    // No payload
};
