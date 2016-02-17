'use strict';
var processor = require('node-amqp-encoder').Processor,
    Composites = require('../types/amqp_composites'),
    AMQPArray = Composites.Array,
    DescribedType = require('../types/described_type'),
    ForcedType = require('../types/forced_type');

var encoder = processor({
  number: function(type, val) {
    switch (type) {
      case 'ulong':
      case 'long':
      case 'uint':
      case 'int':
      case 'ushort':
      case 'short':
      case 'ubyte':
      case 'byte':
      case 'float':
      case 'double':
        return new ForcedType(type, val);

      default:
        throw new Error('Unknown number: ' + type);
    }
  },
  fixed: function(type, val) {
    switch (type) {
      case 'null':
        return null;
      case 'boolean':
        return val;
      default:
        throw new Error('Unknown fixed: ' + type);
    }
  },
  variable: function(type, val) {
    switch (type) {
      case 'string':
        return val;
      case 'symbol':
        return new ForcedType('symbol', val);
      case 'binary':
        return val;
      default:
        throw new Error('Unknown variable: ' + type);
    }
  },
  described: function(type, vals) {
    return new DescribedType(encoder(vals[0]), encoder(vals[1]));
  },
  list: function(type, vals) {
    if (!vals || vals.length === 0) {
      return [];
    } else {
      var result = [];
      vals.forEach(function (val) {
        result.push(encoder(val));
      });
      return result;
    }
  },
  map: function(type, vals) {
    if (!vals || vals.length === 0) {
      return {};
    } else {
      var result = {};
      var isFields = false;
      for (var idx = 0; idx < vals.length; idx += 2) {
        var k = encoder(vals[idx]);
        var v = encoder(vals[idx + 1]);
        if (k instanceof ForcedType) {
          isFields = true;
          result[k.value] = v;
        } else {
          result[k] = v;
        }
      }

      return isFields ? new ForcedType('fields', result) : result;
    }
  },
  array: function(type, vals) {
    if (!vals || vals.length === 0) {
      return new AMQPArray([]);
    } else {
      var eltType = vals[0];
      vals = vals.slice(1);
      var result = [];
      vals.forEach(function (val) {
        result.push(encoder([eltType, val]));
      });
      return new AMQPArray(result, eltType);
    }
  }
});

module.exports = encoder;
