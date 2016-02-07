'use strict';

var util = require('util'),

    DescribedType = require('./described_type'),
    AMQPSymbol = require('./amqp_symbol');

function AMQPError(condition, description, info) {
  AMQPError.super_.call(this, AMQPError);
  this.condition = condition;
  this.description = description;
  this.errorInfo = info;
}

util.inherits(AMQPError, DescribedType);

AMQPError.prototype.Descriptor = { code: 0x1D, name: 'amqp:error:list' };
AMQPError.prototype.getValue = function() {
  return [this.condition, this.description || '', this.errorInfo || ''];
};

AMQPError.InternalError = new AMQPSymbol('amqp:internal-error');
AMQPError.NotFound = new AMQPSymbol('amqp:not-found');
AMQPError.UnauthorizedAccess = new AMQPSymbol('amqp:unauthorized-access');
AMQPError.DecodeError = new AMQPSymbol('amqp:decode-error');
AMQPError.ResourceLimitExceeded = new AMQPSymbol('amqp:resource-limit-exceeded');
AMQPError.NotAllowed = new AMQPSymbol('amqp:not-allowed');
AMQPError.InvalidField = new AMQPSymbol('amqp:invalid-field');
AMQPError.NotImplemented = new AMQPSymbol('amqp:not-implemented');
AMQPError.ResourceLocked = new AMQPSymbol('amqp:resource-locked');
AMQPError.PreconditionFailed = new AMQPSymbol('amqp:precondition-failed');
AMQPError.ResourceDeleted = new AMQPSymbol('amqp:resource-deleted');
AMQPError.IllegalState = new AMQPSymbol('amqp:illegal-state');
AMQPError.FrameSizeTooSmall = new AMQPSymbol('amqp:frame-size-too-small');

// Connection errors
AMQPError.ConnectionForced = new AMQPSymbol('amqp:connection:forced');
AMQPError.ConnectionFramingError = new AMQPSymbol('amqp:connection:framing-error');
AMQPError.ConnectionRedirect = new AMQPSymbol('amqp:connection:redirect');

// Session errors
AMQPError.SessionWindowViolation = new AMQPSymbol('amqp:session:window-violation');
AMQPError.SessionErrantLink = new AMQPSymbol('amqp:session:errant-link');
AMQPError.SessionHandleInUse = new AMQPSymbol('amqp:session:handle-in-use');
AMQPError.SessionUnattachedHandle = new AMQPSymbol('amqp:session:unattached-handle');

// Link errors
AMQPError.LinkDetachForced = new AMQPSymbol('amqp:link:detach-forced');
AMQPError.LinkTransferLimitExceeded = new AMQPSymbol('amqp:link:transfer-limit-exceeded');
AMQPError.LinkMessageSizeExceeded = new AMQPSymbol('amqp:link:message-size-exceeded');
AMQPError.LinkRedirect = new AMQPSymbol('amqp:link:redirect');
AMQPError.LinkStolen = new AMQPSymbol('amqp:link:stolen');

AMQPError.fromDescribedType = function(describedType) {
  return new AMQPError(describedType.value[0], describedType.value[1], describedType.value[2]);
};

module.exports = AMQPError;
