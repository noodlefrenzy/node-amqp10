'use strict';

var debug = require('debug')('amqp10:sasl'),
    constants = require('../constants'),
    frames = require('../frames'),
    errors = require('../errors'),
    u = require('../utilities'),

    Connection = require('../connection'),
    SaslPlain = require('./sasl_plain'),
    SaslAnonymous = require('./sasl_anonymous');

var saslMechanism = {
  PLAIN: 'PLAIN',
  ANONYMOUS: 'ANONYMOUS',
  NONE: 'NONE'
};

var saslHandlers  = {
  PLAIN: SaslPlain,
  ANONYMOUS: SaslAnonymous
};

/**
 * Currently, only supports SASL ANONYMOUS or PLAIN
 *
 * @constructor
 */
function Sasl(mechanism, handler) {
  if (mechanism && !u.includes(saslMechanism, mechanism) && !handler) {
    throw new errors.NotImplementedError(
      'Only SASL PLAIN and ANONYMOUS are supported.');
  }
  this.mechanism = mechanism;
  if (this.mechanism) {
    this.handler = handler || new saslHandlers[mechanism]();
  }
  this.receivedHeader = false;
}

Sasl.Mechanism = saslMechanism;

Sasl.prototype.negotiate = function(connection, credentials, done) {
  this.connection = connection;
  this.credentials = credentials;
  if (this.credentials.user && this.credentials.pass) {
    if  (!this.mechanism || this.mechanism === Sasl.Mechanism.PLAIN) {
      this.mechanism = Sasl.Mechanism.PLAIN;
      this.handler = new SaslPlain(this.credentials.user, this.credentials.pass);
    } else if (this.mechanism === Sasl.Mechanism.ANONYMOUS) {
      debug('warning: user and password specified when using SASL_ANONYMOUS');
    }
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
  var self = this;
  if (frame instanceof frames.SaslMechanismsFrame) {
    var mechanism = this.mechanism;
    var mechanisms = Array.isArray(frame.saslServerMechanisms) ?
      frame.saslServerMechanisms.map(function(m) { return m.value; }) : frame.saslServerMechanisms;
    if (!u.includes(mechanisms, mechanism)) {
      this.callback(new errors.AuthenticationError(
        'SASL ' + mechanism + ' not supported by remote.'));
    }

    if (mechanism === Sasl.Mechanism.ANONYMOUS && this.credentials.user && this.credentials.pass) {
      console.warn(
          'Sasl ANONYMOUS requested, but credentials provided in endpoint URI');
    }

    this.handler.getInitFrame()
      .then(function (initFrame) {
        if (!!self._remoteHostname) initFrame.hostname = self._remoteHostname;
        self.connection.sendFrame(initFrame);
      })
      .catch(function (err) {
        self.callback(new errors.AuthenticationError('SASL Init Failed: ' + frame.code + ': ' + frame.details + ' with error: ' + err.toString()));
      });
  } else if (frame instanceof frames.SaslChallengeFrame) {
    this.handler.getChallengeResponse(frame)
      .then((responseFrame) => {
        self.connection.sendFrame(responseFrame);
      })
      .catch((err) => {
        self.callback(new errors.AuthenticationError('SASL Challenge Failed: ' + frame.code + ': ' + frame.details + ' with error: ' + err.toString()));
      });
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
