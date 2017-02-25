'use strict';
var Builder = require('buffer-builder'),
    Int64 = require('node-int64'),
    errors = require('./errors'),
    AMQPArray = require('./types/amqp_composites').Array,
    AMQPError = require('./types/amqp_error'),
    ForcedType = require('./types/forced_type'),
    DescribedType = require('./types/described_type'),
    u = require('./utilities');

// constants
var MAX_UINT = Math.pow(1<<16, 2);
var MAX_SAFE_HIGH_BITS = Math.pow(2, 53 - 32);

var types = module.exports = {};
types.Type = {};
types.Type.described = function(descriptor, value) { return new DescribedType(descriptor, value); };

function registerType(name, options) {
  types.Type[name] = function(value) { return new ForcedType(name, value); };

  if (typeof options === 'string') { // this is an alias
    types[name] = types[options];
    return;
  }

  if (!types.hasOwnProperty(name)) types[name] = {};
  if (!!options.encoder) {
    types[name].encode = options.encoder;
  } else {
    // default to first encoding
    var typeCode = options.encodings[0].code;
    types[name].encode = function(val, bufb) {
      bufb.appendUInt8(typeCode);
      types[typeCode].encode(val, bufb);
    };
  }

  if (!options.hasOwnProperty('encodings')) return;
  options.encodings.forEach(function(encoding) {
    if (!types.hasOwnProperty(encoding.code)) types[encoding.code] = {};
    types[encoding.code].decode = encoding.decoder;
    types[encoding.code].encode = encoding.encoder;
  });
}

types.registerType = registerType;

/**
 * Encoder methods are used for all examples of that type and are expected to encode to the proper
 * type (e.g. a uint will encode to the fixed-zero-value, the short uint, or the full uint as appropriate).
 *
 * @function encoder
 * @param val               Value to encode (for fixed value encoders (e.g. null) this will be ignored)
 * @param {Builder} buf     Buffer-builder into which to write code and encoded value
 * @param {Codec} [codec]   If needed, the codec to encode other values (e.g. for lists/arrays)
 */

/**
 * Decoder methods decode an incoming buffer into an appropriate concrete JS entity.
 *
 * @function decoder
 * @param {Buffer} buf          Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would
 *                              have the 0xA1 stripped)
 * @param {Codec} [codec]       If needed, the codec to decode sub-values for composite types.
 * @return                      Decoded value
 */

/**
 * Encoder for list types, specified in AMQP 1.0 as:
 *
 <pre>
                       +----------= count items =----------+
                       |                                   |
   n OCTETs   n OCTETs |                                   |
 +----------+----------+--------------+------------+-------+
 |   size   |  count   |      ...    /|    item    |\ ...  |
 +----------+----------+------------/ +------------+ \-----+
                                   / /              \ \
                                  / /                \ \
                                 / /                  \ \
                                +-------------+----------+
                                | constructor |   data   |
                                +-------------+----------+

              Subcategory     n
              =================
              0xC             1
              0xD             4
 </pre>
 *
 * @param {Array} val           Value to encode.
 * @param {Builder} bufb        Buffer-encoder to write encoded list into.
 * @param {Codec} codec         Codec to use for encoding list entries.
 * @param {Number} [width]      Should be 1 or 4.  If given, encoder assumes code already written,
 *                              and will ensure array is encoded to the given byte-width type. Useful for arrays.
 * @private
 */
function listBuilder(list, bufb, codec, width) {
  if (!Array.isArray(list)) {
    throw new errors.EncodingError(list, 'Unsure how to encode non-array as list');
  }

  if (!width && list.length === 0) {
    bufb.appendUInt8(0x45);
    return;
  }

  // Encode all elements into a temp buffer to allow us to front-load appropriate size and count.
  var tempBuilder = new Builder();
  var _len = list.length;
  for (var _i = 0; _i < _len; ++_i) codec.encode(list[_i], tempBuilder);
  var tempBuffer = tempBuilder.get();

  // Code, size, length, data
  if (width === 1 || (tempBuffer.length < 0xFF && list.length < 0xFF && width !== 4)) {
    // list8
    if (!width) bufb.appendUInt8(0xC0);
    bufb.appendUInt8(tempBuffer.length + 1);
    bufb.appendUInt8(list.length);
  } else {
    // list32
    if (!width) bufb.appendUInt8(0xD0);
    bufb.appendUInt32BE(tempBuffer.length + 4);
    bufb.appendUInt32BE(list.length);
  }

  bufb.appendBuffer(tempBuffer);
}

function listDecoder(width, buffer, codec) {
  var offset = width * 2;
  var decoded = codec.decode(buffer, offset);
  var result = [];
  while (decoded !== undefined) {
    result.push(decoded[0]);
    offset += decoded[1];
    decoded = codec.decode(buffer, offset);
  }

  return result;
}

/**
 *
 * All array encodings consist of a size followed by a count followed by an element constructor
 * followed by <i>count</i> elements of encoded data formatted as required by the element
 * constructor:
 <pre>
                                             +--= count elements =--+
                                             |                      |
   n OCTETs   n OCTETs                       |                      |
 +----------+----------+---------------------+-------+------+-------+
 |   size   |  count   | element-constructor |  ...  | data |  ...  |
 +----------+----------+---------------------+-------+------+-------+

                         Subcategory     n
                         =================
                         0xE             1
                         0xF             4
 </pre>
 *
 * @param {AMQPArray} val       Value to encode.
 * @param {Builder} bufb        Buffer-encoder to encode array into.
 * @param {Codec} codec         Codec to use for encoding array values.  Passed into encoder.
 * @param {Number} [width]      Should be 1 or 4.  If given, encoder assumes code already written,
 *                              and will ensure array is encoded to the given byte-width type. Useful for arrays.
 * @private
 */
function arrayBuilder(val, bufb, codec, width) {
  if (!(val instanceof AMQPArray)) {
    throw new errors.EncodingError(val, 'Unsure how to encode non-amqp array as array');
  }

  if (!width && val.array.length === 0) {
    bufb.appendUInt8(0x40); // null
    return;
  }

  if (!types.hasOwnProperty(val.elementType)) {
    throw new errors.EncodingError(val.elementType, 'invalid element type for AMQPArray');
  }

  var encoder = types[val.elementType];
  var _len = val.array.length;
  var buffers = [];
  for (var _i = 0; _i < _len; ++_i) {
    var tempBufb = new Builder();
    encoder.encode(val.array[_i], tempBufb, codec);

    // NOTE: massive hack around the fact that we haven't split the code
    // from encoding.
    if (typeof val.elementType === 'string') {
      if (_i > 0) {
        var tempBuf = new Buffer(tempBufb.length - 1);
        tempBufb.copy(tempBuf, 0, 1, tempBufb.length);
        buffers.push(tempBuf);
      } else {
        buffers.push(tempBufb.get());
      }
    } else {
      buffers.push(tempBufb.get());
    }
  }
  var arrayBytes = Buffer.concat(buffers);
  var length = 0;
  if (width === 1 || (width !== 4 && arrayBytes.length < 0xFF && val.array.length < 0xFF)) {
    if (!width) bufb.appendUInt8(0xE0);
    length = arrayBytes.length + 1;
    if (typeof val.elementType === 'number') length += 1;
    bufb.appendUInt8(length); // buffer + count + constructor
    bufb.appendUInt8(val.array.length);
  } else {
    if (!width) bufb.appendUInt8(0xF0);
    length = arrayBytes.length + 4;
    if (typeof val.elementType === 'number') length += 1;
    bufb.appendUInt32BE(length); // buffer + count + constructor
    bufb.appendUInt32BE(val.array.length);
  }

  if (typeof val.elementType === 'number') bufb.appendUInt8(val.elementType);
  bufb.appendBuffer(arrayBytes);
}

function arrayDecoder(width, buffer, codec) {
  var count = (width === 1) ? buffer.readUInt8(1) : buffer.readUInt32BE(width);
  var offset = width * 2;
  var elementType = buffer.readUInt8(offset++);
  if (!types.hasOwnProperty(elementType)) {
    throw new errors.MalformedPayloadError('Unknown array element type ' + elementType.toString(16));
  }

  var result = [];
  for (var idx = 0; idx < count; ++idx) {
    var decoded = codec.decode(buffer, offset, elementType);
    if (!decoded) {
      throw new errors.MalformedPayloadError('Unable to decode value of ' + elementType.toString(16) + ' from buffer ' + buffer.toString('hex') + ' at index ' + idx + ' of array');
    }

    result.push(decoded[0]);
    offset += decoded[1];
  }

  return result;
}

/**
 * A map is encoded as a compound value where the constituent elements form alternating key value pairs.
 *
 <pre>
  item 0   item 1      item n-1    item n
 +-------+-------+----+---------+---------+
 | key 1 | val 1 | .. | key n/2 | val n/2 |
 +-------+-------+----+---------+---------+
 </pre>
 *
 * Map encodings must contain an even number of items (i.e. an equal number of keys and
 * values). A map in which there exist two identical key values is invalid. Unless known to
 * be otherwise, maps must be considered to be ordered - that is the order of the key-value
 * pairs is semantically important and two maps which are different only in the order in
 * which their key-value pairs are encoded are not equal.
 *
 * @param {Object} val          Value to encode.
 * @param {Builder} bufb        Buffer-builder to encode map into.
 * @param {Codec} codec         Codec to use for encoding keys and values.
 * @param {Number} [width]      Should be 1 or 4.  If given, encoder assumes code already written,
 *                              and will ensure array is encoded to the given byte-width type. Useful for arrays.
 * @private
 */
function mapBuilder(map, bufb, codec, width) {
  if (typeof map !== 'object') {
    throw new errors.EncodingError(map, 'Unsure how to encode non-object as map');
  }

  if (Array.isArray(map)) {
    throw new errors.EncodingError(map, 'Unsure how to encode array as map');
  }

  var keys = Object.keys(map);
  if (!width && keys.length === 0) {
    bufb.appendUInt8(0xC1);
    bufb.appendUInt8(1);
    bufb.appendUInt8(0);
    return;
  }

  // Encode all elements into a temp buffer to allow us to front-load appropriate size and count.
  var tempBuilder = new Builder();
  var _len = keys.length;
  for (var _i = 0; _i < _len; ++_i) {
    codec.encode(keys[_i], tempBuilder);
    codec.encode(map[keys[_i]], tempBuilder);
  }
  var tempBuffer = tempBuilder.get();

  // Code, size, length, data
  if (width === 1 || (width !== 4 && tempBuffer.length < 0xFF)) {
    // map8
    if (!width) bufb.appendUInt8(0xC1);
    bufb.appendUInt8(tempBuffer.length + 1);
    bufb.appendUInt8(keys.length * 2);
  } else {
    // map32
    if (!width) bufb.appendUInt8(0xD1);
    bufb.appendUInt32BE(tempBuffer.length + 4);
    bufb.appendUInt32BE(keys.length * 2);
  }

  bufb.appendBuffer(tempBuffer);
}

function mapBuilderForKeyType(keyType) {
  return function mapBuilder(map, bufb, codec, width) {
    if (typeof map !== 'object') {
      throw new errors.EncodingError(map, 'Unsure how to encode non-object as map');
    }

    if (Array.isArray(map)) {
      throw new errors.EncodingError(map, 'Unsure how to encode array as map');
    }

    var keys = Object.keys(map);
    if (!width && keys.length === 0) {
      bufb.appendUInt8(0xC1);
      bufb.appendUInt8(1);
      bufb.appendUInt8(0);
      return;
    }

    // Encode all elements into a temp buffer to allow us to front-load appropriate size and count.
    var tempBuilder = new Builder();
    var _len = keys.length;
    for (var _i = 0; _i < _len; ++_i) {
      var key = (!!keyType) ? new ForcedType(keyType, keys[_i]) : keys[_i];
      codec.encode(key, tempBuilder);
      codec.encode(map[keys[_i]], tempBuilder);
    }
    var tempBuffer = tempBuilder.get();

    // Code, size, length, data
    if (width === 1 || (width !== 4 && tempBuffer.length < 0xFF)) {
      // map8
      if (!width) bufb.appendUInt8(0xC1);
      bufb.appendUInt8(tempBuffer.length + 1);
      bufb.appendUInt8(keys.length * 2);
    } else {
      // map32
      if (!width) bufb.appendUInt8(0xD1);
      bufb.appendUInt32BE(tempBuffer.length + 4);
      bufb.appendUInt32BE(keys.length * 2);
    }

    bufb.appendBuffer(tempBuffer);
  };
}

function mapDecoder(countSize, buffer, codec) {
  var offset = countSize * 2;
  var decodedKey = codec.decode(buffer, offset);
  var decodedVal;
  var result = {};
  while (decodedKey !== undefined) {
    offset += decodedKey[1];
    decodedVal = codec.decode(buffer, offset);

    if (decodedVal !== undefined) {
      result[decodedKey[0]] = decodedVal[0];
      offset += decodedVal[1];
      decodedKey = codec.decode(buffer, offset);
    }
  }

  return result;
}

function encoding(code, options) {
  options = options || {};
  var encoder = options.encoder || function() { throw new errors.NotImplementedError(code); },
      decoder = options.decoder || function() { throw new errors.NotImplementedError(code); };

  return Object.create(Object.prototype, {
    code: { value: code, configurable: false, writable: false },
    encoder: { value: encoder, configurable: false, writable: false },
    decoder: { value: decoder, configurable: false, writable: false },
  });
}

function bufferOperations(typeName) {
  return {
    encoder: function(val, bufb) { bufb['append' + typeName](val); },
    decoder: function(buf) { return buf['read' + typeName](0); }
  };
}

function constantValue(value) {
  return {
    encoder: function(val, bufb) { },
    decoder: function(buf) { return value; }
  };
}

registerType('null', { encodings: [ encoding(0x40, constantValue(null)) ] });
registerType('boolean', {
  encoder: function(val, bufb) { bufb.appendUInt8(val ? 0x41 : 0x42); },
  encodings: [
    encoding(0x41, constantValue(true)),
    encoding(0x42, constantValue(false)),
    encoding(0x56, {
      encoder: function(val, bufb) { bufb.appendUInt8(val ? 0x01 : 0x00); },
      decoder: function(buf) { return buf[0] ? true : false; }
    })
  ]
});

registerType('ubyte', { encodings: [ encoding(0x50, bufferOperations('UInt8')) ] });
registerType('ushort', { encodings: [ encoding(0x60, bufferOperations('UInt16BE')) ] });
registerType('uint', {
  encoder: function(val, bufb) {
    var code;
    if (val === 0) {
      code = 0x43;
    } else if (val < 0xFF) {
      code = 0x52;
    } else {
      code = 0x70;
    }

    bufb.appendUInt8(code);
    types[code].encode(val, bufb);
  },
  encodings: [
    encoding(0x70, bufferOperations('UInt32BE')),
    encoding(0x52, bufferOperations('UInt8')),
    encoding(0x43, constantValue(0))
  ]
});

registerType('ulong', {
  encoder: function(val, bufb) {
    var code = 0x80;
    if (val instanceof Int64 || val > 0xFF) {
      var check = (val instanceof Int64) ? val.toNumber(true) : val;
      if (check === 0) {
        code = 0x44;
      } else if (check <= 0xFF) {
        code = 0x53;
      }
    } else if (val > 0 && val <= 0xFF) {
      code = 0x53;
    } else if (val === 0) {
      code = 0x44;
    } else {
      throw new errors.EncodingError(val, 'Invalid encoding type for ulong value');
    }

    bufb.appendUInt8(code);
    types[code].encode(val, bufb);
  },
  encodings: [
    encoding(0x53, bufferOperations('UInt8')),
    encoding(0x44, constantValue(0)),
    encoding(0x80, {
      encoder: function(val, bufb) {
        if (val instanceof Int64) return bufb.appendBuffer(val.toBuffer(true));
        if (val instanceof Buffer) return bufb.appendBuffer(val);
        if (typeof val !== 'number' || !(val instanceof Number)) val = Number(val);
        if (!Number.isFinite(val)) {
          throw new errors.EncodingError(val, 'invalid number');
        }

        var high = val / MAX_UINT;
        var low = val % MAX_UINT;
        bufb.appendUInt32BE(high);
        bufb.appendUInt32BE(low);
      },
      decoder: function(buf) {
        var high = buf.readUInt32BE(0);
        var low = buf.readUInt32BE(4);
        if (high < MAX_SAFE_HIGH_BITS)
          return ((high >>> 0) * MAX_UINT) + (low >>> 0);

        var int64 = new Int64(buf);
        var number = int64.toNumber(false);
        if (isFinite(number)) return number;
        return int64;
      }
    })
  ]
});

registerType('byte', { encodings: [ encoding(0x51, bufferOperations('Int8')) ] });
registerType('short', { encodings: [ encoding(0x61, bufferOperations('Int16BE')) ] });
registerType('int', {
  encoder: function(val, bufb) {
    var code = (Math.abs(val) < 0x80) ? 0x54 : 0x71;
    bufb.appendUInt8(code);
    types[code].encode(val, bufb);
  },
  encodings: [
    encoding(0x71, bufferOperations('Int32BE')),
    encoding(0x54, bufferOperations('Int8'))
  ]
});

registerType('long', {
  encoder: function(val, bufb) {
    var check = (val instanceof Int64) ? val.toNumber(true) : val;
    var code = (Math.abs(check) < 0x80) ? 0x55 : 0x81;
    bufb.appendUInt8(code);
    types[code].encode(val, bufb); // @todo Deal with Math.abs(val) < 0x7F cases
  },
  encodings: [
    encoding(0x55, bufferOperations('Int8')),
    encoding(0x81, {
      encoder: function(val, bufb) {
        if (val instanceof Int64) return bufb.appendBuffer(val.toBuffer(true));
        if (val instanceof Buffer) return bufb.appendBuffer(val);
        if (typeof val !== 'number' || !(val instanceof Number)) val = Number(val);
        if (!Number.isFinite(val)) {
          throw new errors.EncodingError(val, 'invalid number');
        }

        var abs = Math.abs(val);
        var high = abs / MAX_UINT;
        var low = abs % MAX_UINT;
        if (val > 0) {
          bufb.appendInt32BE(high);
          bufb.appendUInt32BE(low);
        } else {
          // need to write to a buffer in order to calculate the 2s complement
          var data = new Buffer(8),
              carry = 1, current = low;
          for (var i = 7; i >= 0; i--) {
            var value = ((current & 0xff) ^ 0xff) + carry;
            data[i] = value & 0xff;
            current = (i === 4) ? high : current >>> 8;
            carry = value >> 8;
          }

          bufb.appendBuffer(data);
        }
      },
      decoder: function(buf) {
        var high = buf.readUInt32BE(0);
        var low = buf.readUInt32BE(4);
        if (high < MAX_SAFE_HIGH_BITS && high > -MAX_SAFE_HIGH_BITS)
          return high * MAX_UINT + (low >>> 0);

        var int64 = new Int64(buf);
        var number = int64.toNumber(false);
        if (isFinite(number)) return number;
        return int64;
      }
    })
  ]
});

registerType('float', { encodings: [ encoding(0x72, bufferOperations('FloatBE')) ] });
registerType('double', { encodings: [ encoding(0x82, bufferOperations('DoubleBE')) ] });
registerType('decimal32', { encodings: [ encoding(0x74) ] });
registerType('decimal64', { encodings: [ encoding(0x84) ] });
registerType('decimal128', { encodings: [ encoding(0x94) ] });

registerType('char', {
  encodings: [
    encoding(0x73, {
      encoder: function(val, bufb) {
        bufb.appendUInt8(0x73);
        bufb.appendUInt32BE(val.charCodeAt(0));
      },
      decoder: function(buf) {
        // @todo: this will surely break on something in the future, but in order
        //        to maintain our desire to not depend on any native modules it may
        //        be the best we can do for the moment.
        return String.fromCharCode(buf.readUInt32BE(0));
      }
    })
  ]
});

registerType('timestamp', {
  encodings: [
    encoding(0x83, {
      encoder: function(val, bufb) {
        if (val instanceof Int64) {
          bufb.appendBuffer(val.toBuffer(true));
        } else if (val instanceof Date) {
          bufb.appendBuffer(new Int64(val.getTime()).toBuffer(true));
        } else if (typeof val === 'number') {
          bufb.appendBuffer(new Int64(val).toBuffer(true));
        } else {
          throw new errors.EncodingError(val, 'Invalid encoding type for 64-bit value');
        }
      },
      decoder: function(buf) {
        var tmp = new Int64(buf);
        return new Date(tmp.toNumber(false));

        // @todo: the above conversion is potentially imprecise. We used to
        //        simply run the following line, giving a user access to the
        //        exact value. In the future we should allow users to opt-out
        //        of the above convenience.
        // return new Int64(buf);
      }
    })
  ]
});

registerType('uuid', {
  encodings: [
    encoding(0x98, {
      encoder: function(val, bufb) { bufb.appendBuffer(new Buffer(u.parseUuid(val))); },
      decoder: function(buf) { return u.unparseUuid(buf); }
    })
  ]
});

registerType('binary', {
  encoder: function(val, bufb) {
    val = (val instanceof Buffer) ? val : new Buffer(val);
    var code = (val.length <= 0xFF) ? 0xA0 : 0xB0;
    bufb.appendUInt8(code);
    types[code].encode(val, bufb);
  },
  encodings: [
    encoding(0xa0, {
      encoder: function(val, bufb) {
        bufb.appendUInt8(val.length);
        bufb.appendBuffer(val);
      },
      decoder: function(buf) { return buf.slice(1); }
    }),
    encoding(0xb0, {
      encoder: function(val, bufb) {
        bufb.appendUInt32BE(val.length);
        bufb.appendBuffer(val);
      },
      decoder: function(buf) { return buf.slice(4); }
    })
  ]
});

registerType('string', {
  encoder: function(val, bufb) {
    var encoded = new Buffer(val, 'utf8');
    var code = (encoded.length <= 0xFF) ? 0xA1 : 0xB1;

    bufb.appendUInt8(code);
    types[code].encode(encoded, bufb);
  },
  encodings: [
    encoding(0xa1, {
      encoder: function(val, bufb) {
        var encoded = new Buffer(val, 'utf8');
        bufb.appendUInt8(encoded.length);
        bufb.appendBuffer(encoded);
      },
      decoder: function(buf) {
        if (buf[0] === 0) return '';
        return buf.slice(1).toString('utf8');
      }
    }),
    encoding(0xb1, {
      encoder: function(val, bufb) {
        var encoded = new Buffer(val, 'utf8');
        bufb.appendUInt32BE(encoded.length);
        bufb.appendBuffer(encoded);
      },
      decoder: function(buf) {
        var size = buf.readUInt32BE(0);
        if (size === 0) return '';
        return buf.slice(4).toString('utf8');
      }
    })
  ]
});

registerType('symbol', {
  encoder: function(val, bufb) {
    var encoded = new Buffer(typeof val === 'object' ? val.value : val, 'ascii');
    var code = (encoded.length <= 0xFF) ? 0xA3 : 0xB3;
    bufb.appendUInt8(code);
    types[code].encode(encoded, bufb);
  },
  encodings: [
    encoding(0xa3, {
      encoder: function(val, bufb) {
        var encoded = (val instanceof Buffer) ? val : new Buffer(val, 'ascii');
        bufb.appendUInt8(encoded.length);
        bufb.appendBuffer(encoded);
      },
      decoder: function(buf) { return buf.slice(1).toString('ascii'); }
    }),
    encoding(0xb3, {
      encoder: function(val, bufb) {
        var encoded = (val instanceof Buffer) ? val : new Buffer(val, 'ascii');
        bufb.appendUInt32BE(encoded.length);
        bufb.appendBuffer(encoded);
      },
      decoder: function(buf) { return buf.slice(4).toString('ascii'); }
    })
  ]
});

registerType('list', {
  encoder: listBuilder,
  encodings: [
    encoding(0x45, {
      encoder: function(val, bufb, codec) {},
      decoder: function(buf) { return []; }
    }),
    encoding(0xc0, {
      encoder: function(val, bufb, codec) { listBuilder(val, bufb, codec, 1); },
      decoder: function(buf, codec) { return listDecoder(1, buf, codec); }
    }),
    encoding(0xd0, {
      encoder: function(val, bufb, codec) { listBuilder(val, bufb, codec, 4); },
      decoder: function(buf, codec) { return listDecoder(4, buf, codec); }
    })
  ]
});

registerType('map', {
  encoder: mapBuilder,
  encodings: [
    encoding(0xc1, {
      encoder: function(val, bufb, codec) { mapBuilder(val, bufb, codec, 1); },
      decoder: function(buf, codec) { return mapDecoder(1, buf, codec); }
    }),
    encoding(0xd1, {
      encoder: function(val, bufb, codec) { mapBuilder(val, bufb, codec, 4); },
      decoder: function(buf, codec) { return mapDecoder(4, buf, codec); }
    })
  ]
});

registerType('array', {
  encoder: arrayBuilder,
  encodings: [
    encoding(0xe0, {
      encoder: function(val, bufb, codec) { arrayBuilder(val, bufb, codec, 1); },
      decoder: function(buf, codec) { return arrayDecoder(1, buf, codec); }
    }),
    encoding(0xf0, {
      encoder: function(val, bufb, codec) { arrayBuilder(val, bufb, codec, 4); },
      decoder: function(buf, codec) { return arrayDecoder(4, buf, codec); }
    })
  ]
});

registerType('error', {
  encoder: function(value, bufb, codec) {
    var error = u.isObject(value) ?
      new AMQPError(value) : new AMQPError({ condition: value });
    codec.encode(error, bufb);
  }
});

// aliases
registerType('fields', { encoder: mapBuilderForKeyType('symbol') });
registerType('seconds', 'uint');
registerType('milliseconds', 'uint');
registerType('sequence-no', 'uint');
registerType('transfer-number', 'uint');
registerType('delivery-number', 'uint');
registerType('delivery-tag', 'binary');
registerType('handle', 'uint');
registerType('message-format', 'uint');
registerType('address', 'string');
registerType('ietf-language-tag', 'symbol');
