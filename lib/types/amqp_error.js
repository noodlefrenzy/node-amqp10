'use strict';
var ErrorCondition = require('./error_condition'),
    types = require('../types'),
    errors = require('../errors'),
    u = require('../utilities');

var AMQPError = types.defineComposite({
  name: 'error', code: 0x1d,
  fields: [
    { name: 'condition', type: 'symbol', requires: errorCondition, mandatory: true },
    { name: 'description', type: 'string' },
    { name: 'info', type: 'fields', default: {} }
  ]
});

function errorCondition(value) {
  if (!ErrorCondition.hasOwnProperty(value))
    throw new errors.EncodingError(value, 'invalid error condition');

  return ErrorCondition.hasOwnProperty(ErrorCondition[value]) ?
    ErrorCondition[ErrorCondition[value]] :
    ErrorCondition[value];
}

types.registerType('error', {
  encoder: function(value, bufb, codec) {
    var error = u.isObject(value) ?
      new AMQPError(value) : new AMQPError({ condition: value });
    codec.encode(error, bufb);
  }
});

module.exports = AMQPError;
