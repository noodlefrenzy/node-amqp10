'use strict';
var AMQPSymbol = require('./amqp_symbol'),
    types = require('../types');

var AMQPError = types.defineComposite({
  name: 'error', code: 0x1d,
  fields: [
    { name: 'condition', type: 'symbol', mandatory: 'true' },
    { name: 'description', type: 'string' },
    { name: 'info', type: 'fields' }
  ]
});

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

module.exports = AMQPError;
