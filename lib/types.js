var debug       = require('debug')('amqp10-types'),
    butils      = require('butils'),
    CBuffer     = require('cbarrick-circular-buffer'),
    Int64       = require('node-int64'),

    exceptions  = require('./exceptions');

function isMatch(code) {
    var toMatch = code;
    return function(toCheck) {
        return toCheck === toMatch;
    };
}

/**
 * Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint will
 * encode to the fixed-zero-value, the short uint, or the full uint as appropriate).
 *
 * @function encoder
 * @param val               Value to encode (for fixed value encoders (e.g. null) this will be ignored)
 * @param {Buffer} buf      Buffer into which to write code and encoded value
 * @param {integer} offset  Non-negative byte offset for buffer
 * @return {integer}        New offset value
 */

/**
 * Decoder methods decode an incoming buffer into an appropriate concrete JS entity.
 *
 * @function decoder
 * @param {Buffer} buf      Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped)
 * @return                  Decoded value
 */

/**
 * List of all types.  Each contains a number of encodings, one of which contains an encoder method and all contain decoders.
 *
 * @type types
 */
var types = [
    {
        "class": "primitive",
        "name": "null",
        "label": "indicates an empty value",
        "encodings": [
            {
                "code": "0x40",
                "category": "fixed",
                "width": "0",
                "label": "the null value",
                "encoder": function(val, buf, offset) { butils.writeInt(buf, 0x40, offset || 0); return offset + 1; },
                "decoder": function(buf) { return null; }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "boolean",
        "label": "represents a true or false value",
        "encodings": [
            {
                "code": "0x56",
                "category": "fixed",
                "width": "1",
                "label": "boolean with the octet 0x00 being false and octet 0x01 being true",
                "encoder": function(val, buf, offset) { butils.writeInt(buf, val ? 0x41 : 0x42, offset); return offset + 1; },
                "decoder": function(buf) { return buf[0]; }
            },
            {
                "code": "0x41",
                "category": "fixed",
                "width": "0",
                "label": "the boolean value true",
                "decoder": function(buf) { return true; }
            },
            {
                "code": "0x42",
                "category": "fixed",
                "width": "0",
                "label": "the boolean value false",
                "decoder": function(buf) { return false; }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "ubyte",
        "label": "integer in the range 0 to 2^8 - 1 inclusive",
        "encodings": [
            {
                "code": "0x50",
                "category": "fixed",
                "width": "1",
                "label": "8-bit unsigned integer",
                "encoder": function(val, buf, offset) {
                    butils.writeInt(buf, 0x50, offset);
                    butils.writeInt(buf, val, offset + 1);
                    return offset + 2;
                },
                "decoder": function(buf) { return buf[0]; }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "ushort",
        "label": "integer in the range 0 to 2^16 - 1 inclusive",
        "encodings": [
            {
                "code": "0x60",
                "category": "fixed",
                "width": "2",
                "label": "16-bit unsigned integer in network byte order",
                "encoder": function(val, buf, offset) {
                    butils.writeInt(buf, 0x60, offset);
                    buf.writeUInt16BE(val, offset+1);
                    return offset + 3;
                },
                "decoder": function(buf) { return buf.readUInt16BE(0); }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "uint",
        "label": "integer in the range 0 to 2^32 - 1 inclusive",
        "encodings": [
            {
                "code": "0x70",
                "category": "fixed",
                "width": "4",
                "label": "32-bit unsigned integer in network byte order",
                "encoder": function(val, buf, offset) {
                    var newOffset = offset;
                    if (val === 0) {
                        butils.writeInt(buf, 0x43, offset);
                        newOffset += 1;
                    } else if (val < 0xFF) {
                        butils.writeInt(buf, 0x52, offset);
                        butils.writeInt(buf, val, offset+1);
                        newOffset += 3;
                    } else {
                        butils.writeInt(buf, 0x70, offset);
                        butils.writeInt32(buf, val, offset+1);
                        newOffset += 5;
                    }
                    return newOffset;
                },
                "decoder": function(buf) {
                    return butils.readInt32(buf, 0);
                }
            },
            {
                "code": "0x52",
                "category": "fixed",
                "width": "1",
                "label": "unsigned integer value in the range 0 to 255 inclusive",
                "decoder": function(buf) {
                    return buf[0];
                }
            },
            {
                "code": "0x43",
                "category": "fixed",
                "width": "0",
                "label": "the uint value 0",
                "decoder": function(buf) { return 0; }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "ulong",
        "label": "integer in the range 0 to 2^64 - 1 inclusive",
        "encodings": [
            {
                "code": "0x80",
                "category": "fixed",
                "width": "8",
                "label": "64-bit unsigned integer in network byte order",
                "encoder": function(val, buf, offset) {
                    // TODO: short-code small values - need to cope with quirk related to descriptor codes
                    // TODO: Cope with Int64's lack of unsigned
                    butils.writeInt(buf, 0x80, offset);
                    if (val instanceof Int64) {
                        val.copy(buf, offset+1);
                    } else if (typeof val === 'number') {
                        buf.writeInt64BE(val, offset+1);
                    } else {
                        throw new Error('Invalid encoding type for 64-bit value: ' + val);
                    }
                    return offset + 9;
                },
                "decoder": function(buf) {
                    return new Int64(buf);
                }
            },
            {
                "code": "0x53",
                "category": "fixed",
                "width": "1",
                "label": "unsigned long value in the range 0 to 255 inclusive",
                "decoder": function(buf) {
                    return butils.readInt(buf, 0);
                }
            },
            {
                "code": "0x44",
                "category": "fixed",
                "width": "0",
                "label": "the ulong value 0",
                "decoder": function(buf) { return 0; }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "byte",
        "label": "integer in the range -(2^7) to 2^7 - 1 inclusive",
        "encodings": [
            {
                "code": "0x51",
                "category": "fixed",
                "width": "1",
                "label": "8-bit two's-complement integer",
                "encoder": function(val, buf, offset) {
                    butils.writeInt(buf, 0x51, offset);
                    buf.writeInt8(val, offset+1);
                    return offset + 2;
                },
                "decoder": function(buf) {
                    return buf.readInt8(0);
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "short",
        "label": "integer in the range -(2^15) to 2^15 - 1 inclusive",
        "encodings": [
            {
                "code": "0x61",
                "category": "fixed",
                "width": "2",
                "label": "16-bit two's-complement integer in network byte order",
                "encoder": function(val, buf, offset) {
                    butils.writeInt(buf, 0x61, offset);
                    buf.writeInt16BE(val, offset+1);
                    return offset + 3;
                },
                "decoder": function(buf) {
                    return buf.readInt16BE(0);
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "int",
        "label": "integer in the range -(2^31) to 2^31 - 1 inclusive",
        "encodings": [
            {
                "code": "0x71",
                "category": "fixed",
                "width": "4",
                "label": "32-bit two's-complement integer in network byte order",
                "encoder": function(val, buf, offset) {
                    // TODO: Cope with small values
                    butils.writeInt(buf, 0x71, offset);
                    buf.writeInt32BE(val, offset+1);
                    return offset + 5;
                },
                "decoder": function(buf) {
                    return buf.readInt32BE(0);
                }
            },
            {
                "code": "0x54",
                "category": "fixed",
                "width": "1",
                "label": "signed integer value in the range -128 to 127 inclusive",
                "decoder": function(buf) {
                    return buf.readInt8(0);
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "long",
        "label": "integer in the range -(2^63) to 2^63 - 1 inclusive",
        "encodings": [
            {
                "code": "0x81",
                "category": "fixed",
                "width": "8",
                "label": "64-bit two's-complement integer in network byte order",
                "encoder": function(val, buf, offset) {
                    // TODO: short-code small values - need to cope with quirk related to descriptor codes
                    butils.writeInt(buf, 0x81, offset);
                    if (val instanceof Int64) {
                        val.copy(buf, offset+1);
                    } else if (typeof val === 'number') {
                        buf.writeInt64BE(val, offset+1);
                    } else {
                        throw new Error('Invalid encoding type for 64-bit value: ' + val);
                    }
                    return offset + 9;
                },
                "decoder": function(buf) {
                    return new Int64(buf);
                }
            },
            {
                "code": "0x55",
                "category": "fixed",
                "width": "1",
                "label": "signed long value in the range -128 to 127 inclusive",
                "decoder": function(buf) {
                    return buf.readInt8(0);
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "float",
        "label": "32-bit floating point number (IEEE 754-2008 binary32)",
        "encodings": [
            {
                "code": "0x72",
                "category": "fixed",
                "width": "4",
                "label": "IEEE 754-2008 binary32",
                "encoder": function(val, buf, offset) {
                    butils.writeInt(buf, 0x72, offset);
                    buf.writeFloatBE(val, offset+1);
                    return offset + 5;
                },
                "decoder": function(buf) {
                    return buf.readFloatBE(0);
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "double",
        "label": "64-bit floating point number (IEEE 754-2008 binary64)",
        "encodings": [
            {
                "code": "0x82",
                "category": "fixed",
                "width": "8",
                "label": "IEEE 754-2008 binary64",
                "encoder": function(val, buf, offset) {
                    butils.writeInt(buf, 0x82, offset);
                    buf.writeDoubleBE(val, offset+1);
                    return offset + 9;
                },
                "decoder": function(buf) {
                    return buf.readDoubleBE(0);
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "decimal32",
        "label": "32-bit decimal number (IEEE 754-2008 decimal32)",
        "encodings": [
            {
                "code": "0x74",
                "category": "fixed",
                "width": "4",
                "label": "IEEE 754-2008 decimal32 using the Binary Integer Decimal encoding",
                "encoder": function(val, buf, offset) {
                    throw new exceptions.NotImplementedError('Decimal32');
                },
                "decoder": function(buf) {
                    throw new exceptions.NotImplementedError('Decimal32');
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "decimal64",
        "label": "64-bit decimal number (IEEE 754-2008 decimal64)",
        "encodings": [
            {
                "code": "0x84",
                "category": "fixed",
                "width": "8",
                "label": "IEEE 754-2008 decimal64 using the Binary Integer Decimal encoding",
                "encoder": function(val, buf, offset) {
                    throw new exceptions.NotImplementedError('Decimal64');
                },
                "decoder": function(buf) {
                    throw new exceptions.NotImplementedError('Decimal64');
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "decimal128",
        "label": "128-bit decimal number (IEEE 754-2008 decimal128)",
        "encodings": [
            {
                "code": "0x94",
                "category": "fixed",
                "width": "16",
                "label": "IEEE 754-2008 decimal128 using the Binary Integer Decimal encoding",
                "encoder": function(val, buf, offset) {
                    throw new exceptions.NotImplementedError('Decimal128');
                },
                "decoder": function(buf) {
                    throw new exceptions.NotImplementedError('Decimal128');
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "char",
        "label": "a single unicode character",
        "encodings": [
            {
                "code": "0x73",
                "category": "fixed",
                "width": "4",
                "label": "a UTF-32BE encoded unicode character",
                "encoder": function(val, buf, offset) {
                    throw new exceptions.NotImplementedError('UTF32');
                },
                "decoder": function(buf) {
                    throw new exceptions.NotImplementedError('UTF32');
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "timestamp",
        "label": "an absolute point in time",
        "encodings": [
            {
                "code": "0x83",
                "category": "fixed",
                "width": "8",
                "label": "64-bit signed integer representing milliseconds since the unix epoch",
                "encoder": function(val, buf, offset) {
                    throw new exceptions.NotImplementedError('timestamp');
                },
                "decoder": function(buf) {
                    throw new exceptions.NotImplementedError('timestamp');
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "uuid",
        "label": "a universally unique id as defined by RFC-4122 section 4.1.2",
        "encodings": [
            {
                "code": "0x98",
                "category": "fixed",
                "width": "16",
                "label": "UUID as defined in section 4.1.2 of RFC-4122",
                "encoder": function(val, buf, offset) {
                    throw new exceptions.NotImplementedError('UUID');
                },
                "decoder": function(buf) {
                    throw new exceptions.NotImplementedError('UUID');
                }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "binary",
        "label": "a sequence of octets",
        "encodings": [
            {
                "code": "0xa0",
                "category": "variable",
                "width": "1",
                "label": "up to 2^8 - 1 octets of binary data",
                "encoder": function(val, buf, offset) {
                    var newOffset = offset + 1;
                    if (val.length <= 0xFF) {
                        butils.writeInt(buf, 0xa0, offset);
                        butils.writeInt(buf, val.length, offset+1);
                        newOffset += 1;
                    } else {
                        butils.writeInt(buf, 0xb0, offset);
                        butils.writeInt32(buf, val.length, offset+1);
                        newOffset += 4;
                    }
                    val.copy(buf, newOffset);
                    return newOffset + val.length;
                },
                "decoder": function(buf) { return buf; }
            },
            {
                "code": "0xb0",
                "category": "variable",
                "width": "4",
                "label": "up to 2^32 - 1 octets of binary data",
                "decoder": function(buf) { return buf; }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "string",
        "label": "a sequence of unicode characters",
        "encodings": [
            {
                "code": "0xa1",
                "category": "variable",
                "width": "1",
                "label": "up to 2^8 - 1 octets worth of UTF-8 unicode (with no byte order mark)",
                "encoder": function(val, buf, offset) {
                    var encoded = new Buffer(val, 'utf8');
                    var newOffset = offset + 1;
                    if (encoded.length <= 0xFF) {
                        butils.writeInt(buf, 0xa1, offset);
                        butils.writeInt(buf, encoded.length, offset+1);
                        newOffset += 1;
                    } else {
                        butils.writeInt(buf, 0xb1, offset);
                        butils.writeInt32(buf, encoded.length, offset+1);
                        newOffset += 4;
                    }
                    encoded.copy(buf, newOffset);
                    return newOffset + encoded.length;
                },
                "decoder": function(buf) { return buf.slice(1).toString('utf8'); }
            },
            {
                "code": "0xb1",
                "category": "variable",
                "width": "4",
                "label": "up to 2^32 - 1 octets worth of UTF-8 unicode (with no byte order mark)",
                "decoder": function(buf) { return buf.slice(4).toString('utf8'); }
            }
        ]
    },
    {
        "class": "primitive",
        "name": "symbol",
        "label": "symbolic values from a constrained domain",
        "encodings": [
            {
                "code": "0xa3",
                "category": "variable",
                "width": "1",
                "label": "up to 2^8 - 1 seven bit ASCII characters representing a symbolic value"
            },
            {
                "code": "0xb3",
                "category": "variable",
                "width": "4",
                "label": "up to 2^32 - 1 seven bit ASCII characters representing a symbolic value"
            }
        ]
    },
    {
        "class": "primitive",
        "name": "list",
        "label": "a sequence of polymorphic values",
        "encodings": [
            {
                "code": "0x45",
                "category": "fixed",
                "width": "0",
                "label": "the empty list (i.e. the list with no elements)"
            },
            {
                "code": "0xc0",
                "category": "compound",
                "width": "1",
                "label": "up to 2^8 - 1 list elements with total size less than 2^8 octets"
            },
            {
                "code": "0xd0",
                "category": "compound",
                "width": "4",
                "label": "up to 2^32 - 1 list elements with total size less than 2^32 octets"
            }
        ]
    },
    {
        "class": "primitive",
        "name": "map",
        "label": "a polymorphic mapping from distinct keys to values",
        "encodings": [
            {
                "code": "0xc1",
                "category": "compound",
                "width": "1",
                "label": "up to 2^8 - 1 octets of encoded map data"
            },
            {
                "code": "0xd1",
                "category": "compound",
                "width": "4",
                "label": "up to 2^32 - 1 octets of encoded map data"
            }
        ]
    },
    {
        "class": "primitive",
        "name": "array",
        "label": "a sequence of values of a single type",
        "encodings": [
            {
                "code": "0xe0",
                "category": "array",
                "width": "1",
                "label": "up to 2^8 - 1 array elements with total size less than 2^8 octets"
            },
            {
                "code": "0xf0",
                "category": "array",
                "width": "4",
                "label": "up to 2^32 - 1 array elements with total size less than 2^32 octets"
            }
        ]
    }
];

var encoders = {};
var decoders = {};
for (var idx in types) {
    var curType = types[idx];
    encoders[curType.name] = curType.encodings[0].encoder;
    for (var encIdx in curType.encodings) {
        var curEnc = curType.encodings[encIdx];
        decoders[parseInt(curEnc.code)] = curEnc.decoder;
    }
}

module.exports = {
    typesArray: types,
    encoders: encoders,
    decoders: decoders
};