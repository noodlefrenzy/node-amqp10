'use strict';
var Composites = require('../types/amqp_composites'),
    AMQPArray = Composites.Array,
    DescribedType = require('../types/described_type'),
    ForcedType = require('../types/forced_type'),
    Type = require('../types').Type;

var KNOWN_TYPES = [
  'byte', 'short', 'int', 'long', 'ubyte', 'ushort', 'uint', 'ulong',
  'float', 'double', 'null', 'boolean', 'string', 'symbol', 'list',
  'map', 'array', 'uuid'
];

function translate(input) {
  if (!Array.isArray(input)) {  // raw value
    return input;
  }

  var typeName = input[0];
  var value = input.slice(1);
  if (typeName === 'list') {
    return Type.list(value.map(translate));
  } else if (typeName === 'map') {
    var map = {};
    for (var i = 0; i < value.length; i += 2) {
      map[translate(value[i])] = translate(value[i + 1]);
    }

    return Type.map(map);
  } else if (typeName === 'array') {
    var arrayType = value[0];
    return new AMQPArray(value.slice(1).map(translate), arrayType);
  } else if (typeName === 'described') {
    return new DescribedType(translate(value[0]), translate(value[1]));
  } else if (KNOWN_TYPES.indexOf(typeName) !== -1) {
    return Type[typeName](value[0]);
  }

  return new ForcedType(typeName, translate(value));
}

module.exports = translate;
