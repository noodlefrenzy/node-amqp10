'use strict';

var debug = require('debug')('amqp10:sasl'),
    Builder = require('buffer-builder'),

    constants = require('./constants'),
    frames = require('./frames'),
    errors = require('./errors'),
    u = require('./utilities'),

    Connection = require('./connection');

var saslMechanism = {
  PLAIN: 'PLAIN',
  ANONYMOUS: 'ANONYMOUS',
  NONE: 'NONE'
};

/**
 * Currently, only supports SASL ANONYMOUS or PLAIN
 *
 * @constructor
 */
function Sasl(mechanism) {
  if (mechanism && !u.includes(saslMechanism, mechanism)) {
    throw new errors.NotImplementedError(
      'Only SASL PLAIN and ANONYMOUS are supported.');
  }
  this.mechanism = mechanism;
  this.receivedHeader = false;
}

Sasl.Mechanism = saslMechanism;

Sasl.prototype.negotiate = function(connection, credentials, done) {
  this.connection = connection;
  this.credentials = credentials;
  if (this.credentials.user && this.credentials.pass && !this.mechanism) {
    this.mechanism = Sasl.Mechanism.PLAIN;
  }
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
    var buf = new Builder();
    var mechanism = this.mechanism;
    var mechanisms = Array.isArray(frame.saslServerMechanisms) ?
      frame.saslServerMechanisms.map(function(m) { return m.value; }) : frame.saslServerMechanisms;
    if (!u.includes(mechanisms, mechanism)) {
      this.callback(new errors.AuthenticationError(
        'SASL ' + mechanism + ' not supported by remote.'));
    }
    if (mechanism === Sasl.Mechanism.PLAIN) {
      debug('Sending ' + this.credentials.user + ':' + this.credentials.pass);
      buf.appendUInt8(0); // <null>
      buf.appendString(this.credentials.user);
      buf.appendUInt8(0); // <null>
      buf.appendString(this.credentials.pass);
    } else if (mechanism === Sasl.Mechanism.ANONYMOUS) {
      if (this.credentials.user && this.credentials.pass) {
        console.warn(
            'Sasl ANONYMOUS requested, but credentials provided in endpoint URI');
      }
      buf.appendUInt8(0); // <null>
    } else {
      this.callback(new errors.NotImplementedError(
          'Only SASL PLAIN and ANONYMOUS are supported.'));
    }
    var initFrame = new frames.SaslInitFrame({
      mechanism: mechanism,
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
