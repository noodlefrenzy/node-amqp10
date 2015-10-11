'use strict';

var Builder = require('buffer-builder'),
    Int64 = require('node-int64'),
    uuid = require('uuid'),
    _ = require('lodash'),

    errors = require('./errors'),
    AMQPArray = require('./types/amqp_composites').Array,
    AMQPSymbol = require('./types/amqp_symbol');

/**
 * Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint will
 * encode to the fixed-zero-value, the short uint, or the full uint as appropriate).
 *
 * @function encoder
 * @param val               Value to encode (for fixed value encoders (e.g. null) this will be ignored)
 * @param {builder} buf     Buffer-builder into which to write code and encoded value
 * @param {Codec} [codec]   If needed, the codec to encode other values (e.g. for lists/arrays)
 */

/**
 * Decoder methods decode an incoming buffer into an appropriate concrete JS entity.
 *
 * @function decoder
 * @param {Buffer} buf          Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped)
 * @param {Codec} [codec]       If needed, the codec to decode sub-values for composite types.
 * @return                      Decoded value
 */



/**
 *  Type definitions, encoders, and decoders - used extensively by {@link Codec}.
 *
 * @constructor
 */
var Types = function() {
  this.typesArray = [];
  this.builders = {};
  this.buildersByCode = {};
  this.decoders = {};
  this.typesByName = {};
  this._initTypesArray();
  this._initEncodersDecoders();
};

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
 * @param {builder} bufb        Buffer-builder to write encoded list into.
 * @param {Codec} codec         Codec to use for encoding list entries.
 * @param {Number} [width]      Should be 1 or 4.  If given, builder assumes code already written, and will ensure array is encoded to the given byte-width type.  Useful for arrays.
 * @private
 */
Types.prototype._listBuilder = function(list, bufb, codec, width) {
  if (!Array.isArray(list)) {
    throw new errors.EncodingError('Unsure how to encode non-array as list');
  }

  if (!width && list.length === 0) {
    bufb.appendUInt8(0x45);
    return;
  }

  // Encode all elements into a temp buffer to allow us to front-load appropriate size and count.
  var tempBuilder = new Builder();
  list.forEach(function(value) {
    codec.encode(value, tempBuilder);
  });

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
};

Types.prototype._listDecoder = function(width, buffer, codec) {
  var offset = width * 2;
  var decoded = codec.decode(buffer, offset);
  var result = [];
  while (decoded !== undefined) {
    result.push(decoded[0]);
    offset += decoded[1];
    decoded = codec.decode(buffer, offset);
  }

  return result;
};


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
 * @param {builder} bufb        Buffer-builder to encode array into.
 * @param {Codec} codec         Codec to use for encoding array values.  Passed into encoder.
 * @param {Number} [width]      Should be 1 or 4.  If given, builder assumes code already written, and will ensure array is encoded to the given byte-width type.  Useful for arrays.
 * @private
 */
Types.prototype._arrayBuilder = function(val, bufb, codec, width) {
  if (!(val instanceof AMQPArray)) {
    throw new errors.EncodingError('Unsure how to encode non-amqp-array as array');
  }

  if (!width && val.array.length === 0) {
    bufb.appendUInt8(0x40); // null
    return;
  }

  var tempBufb = new Builder();
  var encode = this.buildersByCode[val.elementType];
  if (!encode) {
    throw new errors.EncodingError('Unable to encode AMQP Array for type: ' + val.elementType + '.  Type builder not found.');
  }

  val.array.forEach(function(element) {
    encode(element, tempBufb, codec);
  });

  var arrayBytes = tempBufb.get();
  if (width === 1 || (width !== 4 && arrayBytes.length < 0xFF && val.array.length < 0xFF)) {
    if (!width) bufb.appendUInt8(0xE0);
    bufb.appendUInt8(arrayBytes.length + 1 + 1); // buffer + count + constructor
    bufb.appendUInt8(val.array.length);
  } else {
    if (!width) bufb.appendUInt8(0xF0);
    bufb.appendUInt32BE(arrayBytes.length + 4 + 1); // buffer + count + constructor
    bufb.appendUInt32BE(val.array.length);
  }

  bufb.appendUInt8(val.elementType);
  bufb.appendBuffer(arrayBytes);
};

Types.prototype._arrayDecoder = function(width, buffer, codec) {
  var count = (width === 1) ? buffer.readUInt8(1) : buffer.readUInt32BE(width);
  var offset = width * 2;
  var elementType = buffer.readUInt8(offset++);
  var decoder = this.decoders[elementType];
  if (!decoder) {
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
};


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
 * @param {builder} bufb        Buffer-builder to encode map into.
 * @param {Codec} codec         Codec to use for encoding keys and values.
 * @param {Number} [width]      Should be 1 or 4.  If given, builder assumes code already written, and will ensure array is encoded to the given byte-width type.  Useful for arrays.
 * @private
 */
Types.prototype._mapBuilder = function(map, bufb, codec, width) {
  if (typeof map !== 'object') {
    throw new errors.EncodingError('Unsure how to encode non-object as array');
  }

  if (Array.isArray(map)) {
    throw new errors.EncodingError('Unsure how to encode array as map');
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
  _.forEach(map, function(value, key) {
    codec.encode(key, tempBuilder);
    codec.encode(value, tempBuilder);
  });

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

Types.prototype._mapDecoder = function(countSize, buffer, codec) {
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
};


/**
 * Initialize list of all types.  Each contains a number of encodings, one of which contains an encoder method and all contain decoders.
 *
 * @private
 */
Types.prototype._initTypesArray = function() {
  var self = this;
  this.typesArray = [
    {
      name: 'null',
      encodings: [
        {
          code: 0x40,
          builder: function(val, bufb) { },
          decoder: function(buf) { return null; }
        }
      ]
    },
    {
      name: 'boolean',
      builder: function(val, bufb) { bufb.appendUInt8(val ? 0x41 : 0x42); },
      encodings: [
        {
          code: 0x56,
          builder: function(val, bufb) { bufb.appendUInt8(val ? 0x01 : 0x00); },
          decoder: function(buf) { return buf[0] ? true : false; }
        },
        {
          code: 0x41,
          builder: function(val, bufb) {},
          decoder: function(buf) { return true; }
        },
        {
          code: 0x42,
          builder: function(val, bufb) {},
          decoder: function(buf) { return false; }
        }
      ]
    },
    {
      name: 'ubyte',
      encodings: [
        {
          code: 0x50,
          builder: function(val, bufb) { bufb.appendUInt8(val); },
          decoder: function(buf) { return buf[0]; }
        }
      ]
    },
    {
      name: 'ushort',
      encodings: [
        {
          code: 0x60,
          builder: function(val, bufb) { bufb.appendUInt16BE(val); },
          decoder: function(buf) { return buf.readUInt16BE(0); }
        }
      ]
    },
    {
      name: 'uint',
      builder: function(val, bufb) {
        var code;
        if (val === 0) {
          code = 0x43;
        } else if (val < 0xFF) {
          code = 0x52;
        } else {
          code = 0x70;
        }

        bufb.appendUInt8(code);
        self.buildersByCode[code](val, bufb);
      },
      encodings: [
        {
          code: 0x70,
          builder: function(val, bufb) { bufb.appendUInt32BE(val); },
          decoder: function(buf) { return buf.readUInt32BE(0); }
        },
        {
          code: 0x52,
          builder: function(val, bufb) { bufb.appendUInt8(val); },
          decoder: function(buf) { return buf[0]; }
        },
        {
          code: 0x43,
          builder: function(val, bufb) {},
          decoder: function(buf) { return 0; }
        }
      ]
    },
    {
      name: 'ulong',
      builder: function(val, bufb) {
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
          throw new errors.EncodingError('Invalid encoding type for ulong value: ' + val);
        }

        bufb.appendUInt8(code);
        self.buildersByCode[code](val, bufb);
      },
      encodings: [
        {
          code: 0x80,
          builder: function(val, bufb) {
            if (val instanceof Int64) {
              bufb.appendBuffer(val.toBuffer(true));
            } else {
              if (val < 0xFFFFFFFF) {
                bufb.appendUInt32BE(0x0);
                bufb.appendUInt32BE(val);
              } else {
                throw new errors.NotImplementedError('No int64 Number supported by buffer builder');
              }
            }
          },
          decoder: function(buf) { return new Int64(buf); }
        },
        {
          code: 0x53,
          builder: function(val, bufb) { bufb.appendUInt8(val); },
          decoder: function(buf) { return new Int64(0x0, buf.readUInt8(0)); }
        },
        {
          code: 0x44,
          builder: function(val, bufb) {},
          decoder: function(buf) { return new Int64(0, 0); }
        }
      ]
    },
    {
      name: 'byte',
      encodings: [
        {
          code: 0x51,
          builder: function(val, bufb) { bufb.appendInt8(val); },
          decoder: function(buf) { return buf.readInt8(0); }
        }
      ]
    },
    {
      name: 'short',
      encodings: [
        {
          code: 0x61,
          builder: function(val, bufb) { bufb.appendInt16BE(val); },
          decoder: function(buf) { return buf.readInt16BE(0); }
        }
      ]
    },
    {
      name: 'int',
      builder: function(val, bufb) {
        var code = (Math.abs(val) < 0x80) ? 0x54 : 0x71;
        bufb.appendUInt8(code);
        self.buildersByCode[code](val, bufb);
      },
      encodings: [
        {
          code: 0x71,
          builder: function(val, bufb) { bufb.appendInt32BE(val); },
          decoder: function(buf) { return buf.readInt32BE(0); }
        },
        {
          code: 0x54,
          builder: function(val, bufb) { bufb.appendInt8(val); },
          decoder: function(buf) { return buf.readInt8(0); }
        }
      ]
    },
    {
      name: 'long',
      builder: function(val, bufb) {
        var check = (val instanceof Int64) ? val.toNumber(true) : val;
        var code = (Math.abs(check) < 0x80) ? 0x55 : 0x81;
        bufb.appendUInt8(code);
        self.buildersByCode[code](val, bufb); // @todo Deal with Math.abs(val) < 0x7F cases
      },
      encodings: [
        {
          code: 0x81,
          builder: function(val, bufb) {
            if (val instanceof Int64) {
              bufb.appendBuffer(val.toBuffer(true));
            } else if (typeof val === 'number') {
              var absval = Math.abs(val);
              if (absval < 0xFFFFFFFF) {
                bufb.appendUInt32BE(val < 0 ? 0xFFFFFFFF : 0x0);
                bufb.appendUInt32BE(val < 0 ? (0xFFFFFFFF - absval + 1) : absval);
              } else {
                throw new errors.NotImplementedError('buffer-builder does not support 64-bit int appending');
              }
            } else {
              throw new errors.EncodingError('Invalid encoding type for 64-bit value: ' + val);
            }
          },
          decoder: function(buf) { return new Int64(buf); }
        },
        {
          code: 0x55,
          builder: function(val, bufb) { bufb.appendInt8(val); },
          decoder: function(buf) { return buf.readInt8(0); }
        }
      ]
    },
    {
      name: 'float',
      encodings: [
        {
          code: 0x72,
          builder: function(val, bufb) { bufb.appendFloatBE(val); },
          decoder: function(buf) { return buf.readFloatBE(0); }
        }
      ]
    },
    {
      name: 'double',
      encodings: [
        {
          code: 0x82,
          builder: function(val, bufb) { bufb.appendDoubleBE(val); },
          decoder: function(buf) { return buf.readDoubleBE(0); }
        }
      ]
    },
    {
      name: 'decimal32',
      encodings: [
        {
          code: 0x74,
          builder: function(val, bufb) {
            throw new errors.NotImplementedError('Decimal32');
          },
          decoder: function(buf) {
            throw new errors.NotImplementedError('Decimal32');
          }
        }
      ]
    },
    {
      name: 'decimal64',
      encodings: [
        {
          code: 0x84,
          builder: function(val, bufb) {
            throw new errors.NotImplementedError('Decimal64');
          },
          decoder: function(buf) {
            throw new errors.NotImplementedError('Decimal64');
          }
        }
      ]
    },
    {
      name: 'decimal128',
      encodings: [
        {
          code: 0x94,
          builder: function(val, bufb) {
            throw new errors.NotImplementedError('Decimal128');
          },
          decoder: function(buf) {
            throw new errors.NotImplementedError('Decimal128');
          }
        }
      ]
    },
    {
      name: 'char',
      encodings: [
        {
          code: 0x73,
          builder: function(val, bufb) {
            throw new errors.NotImplementedError('UTF32');
          },
          decoder: function(buf) {
            throw new errors.NotImplementedError('UTF32');
          }
        }
      ]
    },
    {
      name: 'timestamp',
      encodings: [
        {
          code: 0x83,
          builder: function(val, bufb) {
            if (val instanceof Int64) {
              bufb.appendBuffer(val.toBuffer(true));
            } else if (typeof val === 'number') {
              var absval = Math.abs(val);
              if (absval < 0xFFFFFFFF) {
                bufb.appendUInt32BE(val < 0 ? 0xFFFFFFFF : 0x0);
                bufb.appendUInt32BE(val < 0 ? (0xFFFFFFFF - absval + 1) : absval);
              } else {
                throw new errors.NotImplementedError('buffer-builder does not support 64-bit int appending');
              }
            } else {
              throw new errors.EncodingError('Invalid encoding type for 64-bit value: ' + val);
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
        }
      ]
    },
    {
      name: 'uuid',
      encodings: [
        {
          code: 0x98,
          builder: function(val, bufb) {
            bufb.appendBuffer(new Buffer(uuid.parse(val)));
          },
          decoder: function(buf) {
            return uuid.unparse(buf);
          }
        }
      ]
    },
    {
      name: 'binary',
      builder: function(val, bufb) {
        var code = (val.length <= 0xFF) ? 0xA0 : 0xB0;
        bufb.appendUInt8(code);
        self.buildersByCode[code](val, bufb);
      },
      encodings: [
        {
          code: 0xa0,
          builder: function(val, bufb) {
            bufb.appendUInt8(val.length);
            bufb.appendBuffer(val);
          },
          decoder: function(buf) {
            return buf.slice(1);
          }
        },
        {
          code: 0xb0,
          builder: function(val, bufb) {
            bufb.appendUInt32BE(val.length);
            bufb.appendBuffer(val);
          },
          decoder: function(buf) { return buf.slice(4); }
        }
      ]
    },
    {
      name: 'string',
      builder: function(val, bufb) {
        var encoded = new Buffer(val, 'utf8');
        var code = (encoded.length <= 0xFF) ? 0xA1 : 0xB1;

        bufb.appendUInt8(code);
        self.buildersByCode[code](encoded, bufb);
      },
      encodings: [
        {
          code: 0xa1,
          builder: function(val, bufb) {
            var encoded = new Buffer(val, 'utf8');
            bufb.appendUInt8(encoded.length);
            bufb.appendBuffer(encoded);
          },
          decoder: function(buf) {
            if (buf[0] === 0) return '';
            return buf.slice(1).toString('utf8');
          }
        },
        {
          code: 0xb1,
          builder: function(val, bufb) {
            var encoded = new Buffer(val, 'utf8');
            bufb.appendUInt32BE(encoded.length);
            bufb.appendBuffer(encoded);
          },
          decoder: function(buf) {
            var size = buf.readUInt32BE(0);
            if (size === 0) return '';
            return buf.slice(4).toString('utf8');
          }
        }
      ]
    },
    {
      name: 'symbol',
      builder: function(val, bufb) {
        var encoded = (val instanceof AMQPSymbol) ?
          new Buffer(val.toString(), 'utf8') : new Buffer(val, 'utf8');
        var code = (encoded.length <= 0xFF) ? 0xA3 : 0xB3;

        bufb.appendUInt8(code);
        self.buildersByCode[code](encoded, bufb);
      },
      encodings: [
        {
          code: 0xa3,
          builder: function(val, bufb) {
            var encoded = (val instanceof Buffer) ? val : new Buffer(val, 'utf8');
            bufb.appendUInt8(encoded.length);
            bufb.appendBuffer(encoded);
          },
          decoder: function(buf) {
            /** @todo Work with ASCII instead of UTF8 */
            return new AMQPSymbol(buf.slice(1).toString('utf8'));
          }
        },
        {
          code: 0xb3,
          builder: function(val, bufb) {
            var encoded = new Buffer(val, 'utf8');
            bufb.appendUInt32BE(encoded.length);
            bufb.appendBuffer(encoded);
          },
          decoder: function(buf) {
            /** @todo Work with ASCII instead of UTF8 */
            return new AMQPSymbol(buf.slice(4).toString('utf8'));
          }
        }
      ]
    },
    {
      name: 'list',
      builder: this._listBuilder,
      encodings: [
        {
          code: 0x45,
          builder: function(val, bufb, codec) {},
          decoder: function(buf) { return []; }
        },
        {
          code: 0xc0,
          builder: function(val, bufb, codec) { self._listBuilder(val, bufb, codec, 1); },
          decoder: function(buf, codec) { return self._listDecoder(1, buf, codec); }
        },
        {
          code: 0xd0,
          builder: function(val, bufb, codec) { self._listBuilder(val, bufb, codec, 4); },
          decoder: function(buf, codec) { return self._listDecoder(4, buf, codec); }
        }
      ]
    },
    {
      name: 'map',
      builder: this._mapBuilder,
      encodings: [
        {
          code: 0xc1,
          builder: function(val, bufb, codec) { self._mapBuilder(val, bufb, codec, 1); },
          decoder: function(buf, codec) { return self._mapDecoder(1, buf, codec); }
        },
        {
          code: 0xd1,
          builder: function(val, bufb, codec) { self._mapBuilder(val, bufb, codec, 4); },
          decoder: function(buf, codec) { return self._mapDecoder(4, buf, codec); }
        }
      ]
    },
    {
      name: 'array',
      builder: function(val, bufb, codec) { self._arrayBuilder(val, bufb, codec); },
      encodings: [
        {
          code: 0xe0,
          builder: function(val, bufb, codec) { self._arrayBuilder(val, bufb, codec, 1); },
          decoder: function(buf, codec) { return self._arrayDecoder(1, buf, codec); }
        },
        {
          code: 0xf0,
          builder: function(val, bufb, codec) { self._arrayBuilder(val, bufb, codec, 4); },
          decoder: function(buf, codec) { return self._arrayDecoder(4, buf, codec); }
        }
      ]
    }
  ];
};


/**
 * Initialize all encoders and decoders based on type array.
 *
 * @private
 */
Types.prototype._initEncodersDecoders = function() {
  this.builders = {};
  this.buildersByCode = {};
  this.decoders = {};

  var self = this;
  this.typesArray.forEach(function(type) {
    self.typesByName[type.name] = type;

    if (!!type.builder) {
      self.builders[type.name] = type.builder;
    } else {
      // default to first encoding
      var typeCode = type.encodings[0].code;
      self.builders[type.name] = function(val, bufb) {
        bufb.appendUInt8(typeCode);
        self.buildersByCode[typeCode](val, bufb);
      };
    }

    type.encodings.forEach(function(encoding) {
      self.decoders[encoding.code] = encoding.decoder;
      self.buildersByCode[encoding.code] = encoding.builder;
    });
  });
};

module.exports = new Types();
