'use strict';

var util = require('util'),
    AMQPError = require('./types/amqp_error');

var errors = module.exports = {};

errors.wrapProtocolError = function(err) {
  if (err instanceof AMQPError) {
    return new errors.ProtocolError(err.condition, err.description, err.info);
  }

  return err;
};

/**
 * The base error all amqp10 Errors inherit from.
 *
 * @constructor
 * @alias Error
 */
errors.BaseError = function() {
  var tmp = Error.apply(this, arguments);
  tmp.name = this.name = 'AmqpError';

  this.message = tmp.message;
  if (Error.captureStackTrace)
    Error.captureStackTrace(this, this.constructor);
};
util.inherits(errors.BaseError, Error);

errors.ProtocolError = function(condition, description, errorInfo) {
  errors.BaseError.call(this, condition + ':' + (description || 'no description'));
  this.name = 'AmqpProtocolError';

  this.condition = condition;
  this.description = description;
  this.errorInfo = errorInfo;
};
util.inherits(errors.ProtocolError, errors.BaseError);

/**
 * AMQP Header is malformed.
 *
 * @param header
 * @extends BaseError
 * @constructor
 */
errors.MalformedHeaderError = function(header) {
  errors.BaseError.call(this, 'malformed header: ' + header);
  this.name = 'AmqpMalformedHeaderError';
};
util.inherits(errors.MalformedHeaderError, errors.BaseError);

/**
 * Method or feature is not yet implemented.
 *
 * @param feature
 * @extends BaseError
 * @constructor
 */
errors.NotImplementedError = function(feature) {
  errors.BaseError.call(this, feature + ' not yet implemented');
  this.name = 'AmqpNotImplementedError';
};
util.inherits(errors.NotImplementedError, errors.BaseError);

/**
 * Payload is malformed or cannot be parsed.
 *
 * @param payload
 * @extends BaseError
 * @constructor
 */
errors.MalformedPayloadError = function(payload) {
  errors.BaseError.call(this, 'malformed payload: ' + payload);
  this.name = 'AmqpMalformedPayloadError';
};
util.inherits(errors.MalformedPayloadError, errors.BaseError);

/**
 * Given object cannot be encoded successfully.
 *
 * @param value         the value that caused the encoding error
 * @param message       an optional message giving context to the error
 * @extends BaseError
 * @constructor
 */
errors.EncodingError = function(value, message) {
  message = message || 'encoding failure';
  errors.BaseError.call(this, message);
  this.name = 'AmqpEncodingError';
  this.value = value;
};
util.inherits(errors.EncodingError, errors.BaseError);

/**
 * Violation of AMQP flow control.
 *
 * @param msg
 * @extends BaseError
 * @constructor
 */
errors.OverCapacityError = function(msg) {
  errors.BaseError.call(this, msg);
  this.name = 'AmqpOverCapacityError';
};
util.inherits(errors.OverCapacityError, errors.BaseError);

/**
 * Authentication failure.
 *
 * @param msg
 * @extends BaseError
 * @constructor
 */
errors.AuthenticationError = function(msg) {
  errors.BaseError.call(this, msg);
  this.name = 'AmqpAuthenticationError';
};
util.inherits(errors.AuthenticationError, errors.BaseError);

/**
 * Invalid state.
 *
 * @param msg
 * @extends BaseError
 * @constructor
 */
errors.InvalidStateError = function(msg) {
  errors.BaseError.call(this, msg);
  this.name = 'AmqpInvalidStateError';
};
util.inherits(errors.InvalidStateError, errors.BaseError);

/**
 * Connection error
 *
 * @param msg
 * @extends BaseError
 * @constructor
 */
errors.ConnectionError = function(msg) {
  errors.BaseError.call(this, msg);
  this.name = 'AmqpConnectionError';
};
util.inherits(errors.ConnectionError, errors.BaseError);

/**
 * Disconnected error
 *
 * @param msg
 * @extends ConnectionError
 * @constructor
 */
errors.DisconnectedError = function(msg) {
  errors.ConnectionError.call(this, msg);
  this.name = 'AmqpDisconnectedError';
};
util.inherits(errors.DisconnectedError, errors.ConnectionError);

/**
 * AMQP Version error
 *
 * @param msg
 * @extends BaseError
 * @constructor
 */
errors.VersionError = function(msg) {
  errors.BaseError.call(this, msg);
  this.name = 'AmqpVersionError';
};
util.inherits(errors.VersionError, errors.BaseError);

/**
 * Invalid subject specified for receiver or sender link creation.
 *
 * @param subject the subject specified
 * @extends BaseError
 * @constructor
 */
errors.InvalidSubjectError = function(subject) {
  errors.BaseError.call(this, 'Invalid subject: ' + subject);
  this.name = 'AmqpInvalidSubjectError';
};
util.inherits(errors.InvalidSubjectError, errors.BaseError);

/**
 * Used to signal transport-related errors
 *
 * @extends BaseError
 * @constructor
 */
errors.TransportError = function(msg) {
  errors.BaseError.call(this, msg);
  this.name = 'AmqpTransportError';
};
util.inherits(errors.TransportError, errors.BaseError);

/**
 * Used to indicate that a link requires an active connection
 *
 * @extends BaseError
 * @constructor
 */
errors.NotConnectedError = function(msg) {
  errors.BaseError.call(this, msg);
  this.name = 'AmqpNotConnectedError';
};
util.inherits(errors.NotConnectedError, errors.BaseError);
