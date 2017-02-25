'use strict';
var Composites = require('../types/amqp_composites'),
    AMQPArray = Composites.Array,
    DescribedType = require('../types/described_type'),
    ForcedType = require('../types/forced_type'),
    Encoder = require('../types').Encoder;

var singleValue = function(encodedVal) {
  var isArray = encodedVal instanceof Array;
  var type = isArray ? encodedVal[0] : encodedVal;
  if (!isArray || encodedVal.length === 1) {
    // Likely a primitive type
    if (type === null) {
      return Encoder.null(null);
    } else if (typeof type === 'boolean') {
      return Encoder.boolean(type);
    } else if (type instanceof Buffer) {
      return Encoder.binary(type);
    }
  }

  switch (type) {
    case 'byte':
    case 'short':
    case 'int':
    case 'long':
    case 'ubyte':
    case 'ushort':
    case 'uint':
    case 'ulong':
    case 'float':
    case 'double':
    case 'null':
    case 'boolean':
    case 'string':
    case 'symbol':
    case 'list':
    case 'map':
    case 'array':
    case 'uuid':
      return Encoder[type](encodedVal[1]);

    case 'described':
      return encoder.described(encodedVal[1], encodedVal[2]);

    default:
      // If no val, assume it's just a raw string
      if (!isArray || encodedVal.length === 1) {
          return Encoder.string(type);
      } else {
          throw new Error('Unknown encoding type: ' + type);
      }
    }
};

module.exports = function (encoded) {
  if (encoded[0] instanceof Array) {
    // A set of encoded values.
    var result = [];
    for (var idx = 0; idx < encoded.length; ++idx) {
      result.push(singleValue(encoded[idx]));
    }
    return result;
  } else {
    // Only a single encoded value
    return singleValue(encoded);
  }
};