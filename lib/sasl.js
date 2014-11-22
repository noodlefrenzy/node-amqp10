var debug       = require('debug')('amqp10-Sasl'),

    constants   = require('./constants'),
    codec       = require('./codec'),
    exceptions  = require('./exceptions'),

    AMQPError   = require('./types/amqp_error'),
    DescribedType   = require('./types/described_type'),

    FrameReader = require('./frames/frame_reader'),
    SaslFrames  = require('./frames/sasl_frame'),

    Connection  = require('./connection');

/**
 * Currently, only supports SASL-PLAIN
 *
 * @constructor
 */
function Sasl(connection) {
    Sasl.super_.call(this);
    this.connection = connection;
}

Sasl.prototype.negotiate = function(credentials, done) {
    this.credentials = credentials;
    this.callback = done;
    var self = this;
    this._processFrameEH = function(frame) { self._processFrame(frame); };
    this.connection.on(Connection.FrameReceived, this._processFrameEH);
    this._sendHeader();
};

Sasl.prototype._sendHeader = function() {
    // @todo Refactor to allow sending without reaching into connection's internals.
    this.connection.client.write(constants.saslVersion);
};

// @todo Wire support in connection to deliver back to us when it receives SASL header.
// @todo Methods for sending init, receiving challenge, sending response, receiving outcome.

module.exports = Sasl;
