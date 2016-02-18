'use strict';

var util = require('util');
var errors = module.exports = {};

/**
 * The base error all amqp10 Errors inherit from.
 *
 * @constructor
 * @alias Error
 */
errors.BaseError = function() {
  var tmp = Error.apply(this, arguments);
  tmp.name = this.name = 'AmqpBaseError';

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
 * Argument missing or incorrectly defined.
 *
 * @param arg
 * @extends BaseError
 * @constructor
 */
errors.ArgumentError = function(arg) {
  var message = (arg instanceof Array) ?
    'must provide arguments ' + arg.join(', ') : 'must provide argument ' + arg;
  errors.BaseError.call(this, message);
  this.name = 'AmqpArgumentError';
};
util.inherits(errors.ArgumentError, errors.BaseError);

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
