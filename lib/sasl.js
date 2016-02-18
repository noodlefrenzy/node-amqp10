'use strict';

var debug = require('debug')('amqp10:sasl'),
    Builder = require('buffer-builder'),

    constants = require('./constants'),
    frames = require('./frames'),
    errors = require('./errors'),
    u = require('./utilities'),

    Connection = require('./connection');

/**
 * Currently, only supports SASL-PLAIN
 *
 * @constructor
 */
function Sasl() {
  this.receivedHeader = false;
}

Sasl.prototype.negotiate = function(connection, credentials, done) {
  u.assertArguments(credentials, ['user', 'pass']);
  this.connection = connection;
  this.credentials = credentials;
  this.callback = done;
  var self = this;
  this._processFrameEH = function(frame) { self._processFrame(frame); };
  this.connection.on(Connection.FrameReceived, this._processFrameEH);
  this._sendHeader();
};

Sasl.prototype._sendHeader = function() {
  this.connection.sendHeader(constants.saslVersion);
};

Sasl.prototype.headerReceived = function(header) {
  debug('Server SASL Version: ' + header.toString('hex') + ' vs ' + constants.saslVersion.toString('hex'));
  if (u.bufferEquals(header, constants.saslVersion)) {
    this.receivedHeader = true;
    // Wait for mechanisms
  } else {
    this.callback(new errors.MalformedHeaderError('Invalid SASL Header ' + header.toString('hex')));
  }
};

Sasl.prototype._processFrame = function(frame) {
  if (frame instanceof frames.SaslMechanismsFrame) {
    if (!u.includes(frame.saslServerMechanisms, 'PLAIN')) {
      throw new errors.NotImplementedError('Only supports SASL-PLAIN at the moment.');
    }

    debug('Sending ' + this.credentials.user + ':' + this.credentials.pass);
    var buf = new Builder();
    buf.appendUInt8(0); // <null>
    buf.appendString(this.credentials.user);
    buf.appendUInt8(0); // <null>
    buf.appendString(this.credentials.pass);
    var initFrame = new frames.SaslInitFrame({
      mechanism: 'PLAIN',
      initialResponse: buf.get()
    });

    if (!!this._remoteHostname) initFrame.hostname = this._remoteHostname;
    this.connection.sendFrame(initFrame);
  } else if (frame instanceof frames.SaslChallengeFrame) {
    var responseFrame = new frames.SaslResponseFrame({});
    this.connection.sendFrame(responseFrame);
  } else if (frame instanceof frames.SaslOutcomeFrame) {
    if (frame.code === constants.saslOutcomes.ok) {
      this.callback();
    } else {
      this.callback(new errors.AuthenticationError('SASL Failed: ' + frame.code + ': ' + frame.details));
    }
  }
};

// @todo: Methods for sending init, receiving challenge, sending response, receiving outcome.

module.exports = Sasl;
