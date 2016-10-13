'use strict';
var u = require('../utilities'),
    ErrorCondition = module.exports = {};

function defineErrorCondition(symbol) {
  var stringReference = symbol.replace(/amqp:/, '');
  var enumReference = u.camelCase(stringReference);
  enumReference = enumReference.charAt(0).toUpperCase() + enumReference.slice(1);
  ErrorCondition[stringReference] = symbol;
  ErrorCondition[enumReference] = stringReference;
  ErrorCondition[symbol] = symbol;
}

// shared
defineErrorCondition('amqp:internal-error');
defineErrorCondition('amqp:not-found');
defineErrorCondition('amqp:unauthorized-access');
defineErrorCondition('amqp:decode-error');
defineErrorCondition('amqp:resource-limit-exceeded');
defineErrorCondition('amqp:not-allowed');
defineErrorCondition('amqp:invalid-field');
defineErrorCondition('amqp:not-implemented');
defineErrorCondition('amqp:resource-locked');
defineErrorCondition('amqp:precondition-failed');
defineErrorCondition('amqp:resource-deleted');
defineErrorCondition('amqp:illegal-state');
defineErrorCondition('amqp:frame-size-too-small');

// connection
defineErrorCondition('amqp:connection:forced');
defineErrorCondition('amqp:connection:framing-error');
defineErrorCondition('amqp:connection:redirect');

// session
defineErrorCondition('amqp:session:window-violation');
defineErrorCondition('amqp:session:errant-link');
defineErrorCondition('amqp:session:handle-in-use');
defineErrorCondition('amqp:session:unattached-handle');

// link
defineErrorCondition('amqp:link:detach-forced');
defineErrorCondition('amqp:link:transfer-limit-exceeded');
defineErrorCondition('amqp:link:message-size-exceeded');
defineErrorCondition('amqp:link:redirect');
defineErrorCondition('amqp:link:stolen');
