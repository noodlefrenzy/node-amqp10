'use strict';
var types = require('../types');
var AMQPError = types.defineComposite({
  name: 'error', code: 0x1d,
  fields: [
    { name: 'condition', type: 'symbol', mandatory: 'true' },
    { name: 'description', type: 'string' },
    { name: 'info', type: 'fields' }
  ]
});

AMQPError.InternalError = 'amqp:internal-error';
AMQPError.NotFound = 'amqp:not-found';
AMQPError.UnauthorizedAccess = 'amqp:unauthorized-access';
AMQPError.DecodeError = 'amqp:decode-error';
AMQPError.ResourceLimitExceeded = 'amqp:resource-limit-exceeded';
AMQPError.NotAllowed = 'amqp:not-allowed';
AMQPError.InvalidField = 'amqp:invalid-field';
AMQPError.NotImplemented = 'amqp:not-implemented';
AMQPError.ResourceLocked = 'amqp:resource-locked';
AMQPError.PreconditionFailed = 'amqp:precondition-failed';
AMQPError.ResourceDeleted = 'amqp:resource-deleted';
AMQPError.IllegalState = 'amqp:illegal-state';
AMQPError.FrameSizeTooSmall = 'amqp:frame-size-too-small';

// Connection errors
AMQPError.ConnectionForced = 'amqp:connection:forced';
AMQPError.ConnectionFramingError = 'amqp:connection:framing-error';
AMQPError.ConnectionRedirect = 'amqp:connection:redirect';

// Session errors
AMQPError.SessionWindowViolation = 'amqp:session:window-violation';
AMQPError.SessionErrantLink = 'amqp:session:errant-link';
AMQPError.SessionHandleInUse = 'amqp:session:handle-in-use';
AMQPError.SessionUnattachedHandle = 'amqp:session:unattached-handle';

// Link errors
AMQPError.LinkDetachForced = 'amqp:link:detach-forced';
AMQPError.LinkTransferLimitExceeded = 'amqp:link:transfer-limit-exceeded';
AMQPError.LinkMessageSizeExceeded = 'amqp:link:message-size-exceeded';
AMQPError.LinkRedirect = 'amqp:link:redirect';
AMQPError.LinkStolen = 'amqp:link:stolen';

module.exports = AMQPError;
