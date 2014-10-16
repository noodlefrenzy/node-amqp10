var debug       = require('debug')('amqp10-Codec'),
    util        = require('util'),
    butils      = require('butils'),
    CBuffer     = require('cbarrick-circular-buffer'),

    constants   = require('./constants'),
    DescribedType = require('./described_type'),
    exceptions  = require('./exceptions'),
    types       = require('./types');


/**
 * Build a codec.
 *
 * @constructor
 */
var Codec = function() {
};

/**
 * Acquired from http://stackoverflow.com/questions/3885817/how-to-check-if-a-number-is-float-or-integer
 *
 * @param {number} n        Number to test.
 * @returns {boolean}       True if integral.
 * @private
 */
Codec.prototype._isInteger = function(n) {
    return n === +n && n === (n|0);
};

Codec.prototype._remaining = function(buf, offset) {
    return (buf instanceof CBuffer) ? buf.length : (buf.length - offset);
};

Codec.prototype._peek = function(buf, offset, numBytes) {
    return (buf instanceof CBuffer) ? buf.peek(numBytes) : buf.slice(offset, offset + numBytes);
};

Codec.prototype._read = function(buf, offset, numBytes) {
    return (buf instanceof CBuffer) ? buf.read(numBytes) : buf.slice(offset, offset + numBytes);
};

/**
 * Reads a full value's worth of bytes from a circular or regular buffer, or returns undefined if not enough bytes are there.
 * Note that for Buffers, the returned Buffer will be a slice (so backed by the original storage)!
 *
 * @param {Buffer|CBuffer} buf      Buffer or circular buffer to read from.  If a Buffer is given, it is assumed to be full.
 * @param {integer} [offset=0]      Offset - only valid for Buffer, not CBuffer.
 * @returns {Array}                 Buffer of full value + number of bytes read
 * @private
 */
Codec.prototype._readFullValue = function(buf, offset) {
    offset = offset || 0;

    var self = this;
    var remaining = this._remaining(buf, offset);
    if (remaining < 1) return undefined;

    var code = this._peek(buf, offset, 1);
    var codePrefix = code[0] & 0xF0;
    var codeAndLength, numBytes;
    var readFixed = function(nBytes) { return remaining >= nBytes ? [ self._read(buf, offset, nBytes), nBytes ] : undefined; };
    switch (codePrefix) {
        case 0x40: return readFixed(1);
        case 0x50: return readFixed(2);
        case 0x60: return readFixed(3);
        case 0x70: return readFixed(5);
        case 0x80: return readFixed(9);
        case 0x90: return readFixed(17);
        case 0xA0:
        case 0xC0:
        case 0xE0:
            if (remaining < 2) return undefined;
            codeAndLength = this._peek(buf, offset, 2);
            numBytes = codeAndLength[1] + 2; // code + size + # octets
            debug('Reading variable 0x'+codePrefix.toString(16)+' of length '+numBytes);
            return remaining >= numBytes ? [ this._read(buf, offset, numBytes), numBytes ] : undefined;
        case 0xB0:
        case 0xD0:
        case 0xF0:
            if (remaining < 5) return false;
            codeAndLength = this._peek(buf, offset, 5);
            numBytes = butils.readInt32(codeAndLength, 1) + 5; // code + size + #octets
            debug('Reading variable 0x'+codePrefix.toString(16)+' of length '+numBytes);
            return remaining >= numBytes ? [ this._read(buf, offset, numBytes), numBytes ] : undefined;

        default:
            throw new exceptions.MalformedPayloadError('Unknown code prefix: 0x' + codePrefix.toString(16));
    }
};

/**
 * Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.
 *
 * @param {Buffer|CBuffer} buf          The buffer/circular buffer to decode.  Will decode a single value per call.
 * @param {integer} [offset=0]          The offset to read from (only used for Buffers).
 * @return {Array}                      Single decoded value + number of bytes consumed.
 */
Codec.prototype.decode = function(buf, offset) {
    var fullBuf = this._readFullValue(buf, offset);
    if (fullBuf) {
        debug('Decoding '+fullBuf[0].toString('hex'));
        var code = fullBuf[0][0];
        var decoder = types.decoders[code];
        if (!decoder) {
            throw new exceptions.MalformedPayloadError('Unknown code: 0x' + code.toString(16));
        } else {
            return [ decoder(fullBuf[0].slice(1), this), fullBuf[1] ];
        }
    }

    /** @todo debug unmatched */
    return undefined;
};

/**
 * Encode the given value as an AMQP 1.0 bitstring.
 *
 * @param val                           Value to encode.
 * @param buf                           Buffer to write into.
 * @param [offset=0]                    Offset at which to start writing.
 * @param {string} [forceType]          If set, forces the encoder for the given type.
 * @returns {integer}                   New offset.
 */
Codec.prototype.encode = function(val, buf, offset, forceType) {
    var type = typeof val;
    var encoder;
    switch (type) {
        case 'string':
            encoder = types.encoders[forceType || 'string'];
            return encoder(val, buf, offset);

        case 'number':
            var typeName = 'double';
            if (forceType) {
                typeName = forceType;
            } else {
                // TODO: signed vs. unsigned, byte/short/int32/long
                if (this._isInteger(val)) {
                    if (Math.abs(val) < 0x7FFFFFFF) {
                        typeName = 'int';
                    } else {
                        typeName = 'long';
                    }
                } else {
                    // TODO: float vs. double
                }
            }
            debug('Encoding number '+val+' as '+typeName);
            encoder = types.encoders[typeName];
            if (!encoder) throw new exceptions.NotImplementedError('encode('+typeName+')');
            return encoder(val, buf, offset);

        case 'object':
            if (val instanceof Array) {
                encoder = types.encoders.list;
                return encoder(val, buf, offset, this);
            } else {
                throw new exceptions.NotImplementedError('encode(object)');
            }
            break;

        default:
            throw new exceptions.NotImplementedError('encode('+type+')');
    }
};

module.exports = new Codec();
