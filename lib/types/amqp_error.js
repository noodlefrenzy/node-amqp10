'use strict';
var ErrorCondition = require('./error_condition'),
    defineComposite = require('./composite_type').defineComposite,
    errors = require('../errors');

function errorCondition(value) {
  if (!ErrorCondition.hasOwnProperty(value))
    throw new errors.EncodingError(value, 'invalid error condition: ' + value);

  return ErrorCondition.hasOwnProperty(ErrorCondition[value]) ?
    ErrorCondition[ErrorCondition[value]] :
    ErrorCondition[value];
}

var AMQPError = defineComposite({
  name: 'error', code: 0x1d,
  fields: [
    { name: 'condition', type: 'symbol', requires: errorCondition, mandatory: true },
    { name: 'description', type: 'string' },
    { name: 'info', type: 'fields', default: {} }
  ]
});

module.exports = AMQPError;
