var bitsyntax   = require('bitsyntax'),
    debug       = require('debug')('amqp10-Codec'),
    util        = require('util'),
    butils      = require('butils'),
    CBuffer     = require('cbarrick-circular-buffer'),

    constants   = require('./constants'),
    exceptions  = require('./exceptions'),
    types       = require('./types');


/**
 * Build a codec, turning constants defining AMQP1.0 types into specific bitsyntax parsers and builders.
 *
 * @constructor
 */
var Codec = function() {
};

Codec.prototype._readFullValue = function(cbuf) {
    if (cbuf.length < 1) return false;
    var code = cbuf.peek(1);
    var codePrefix = code[0] & 0xF0;
    var codeAndLength, numBytes;
    var readFixed = function(nBytes) { return cbuf.length >= nBytes ? cbuf.read(nBytes) : undefined; };
    switch (codePrefix) {
        case 0x40: return cbuf.read(1);
        case 0x50: return readFixed(2);
        case 0x60: return readFixed(3);
        case 0x70: return readFixed(5);
        case 0x80: return readFixed(9);
        case 0x90: return readFixed(17);
        case 0xA0:
        case 0xC0:
        case 0xE0:
            if (cbuf.length < 2) return false;
            codeAndLength = cbuf.peek(2);
            numBytes = codeAndLength[1] + 2; // code + size + # octets
            debug('Reading variable 0x'+codePrefix.toString(16)+' of length '+numBytes);
            return cbuf.length >= numBytes ? cbuf.read(numBytes) : undefined;
        case 0xB0:
        case 0xD0:
        case 0xF0:
            if (cbuf.length < 5) return false;
            codeAndLength = cbuf.peek(5);
            numBytes = butils.readInt32(codeAndLength, 1) + 5; // code + size + #octets
            debug('Reading variable 0x'+codePrefix.toString(16)+' of length '+numBytes);
            return cbuf.length >= numBytes ? cbuf.read(numBytes) : undefined;

        default:
            throw new exceptions.MalformedPayloadError('Unknown code prefix: 0x' + codePrefix.toString(16));
    }
};

/**
 * Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.
 *
 * @param {*} cbuf          The circular buffer to decode.  Will decode a single value per call.
 * @return                  Single decoded value.
 */
Codec.prototype.decode = function(cbuf) {
    var fullBuf = this._readFullValue(cbuf);
    if (fullBuf) {
        debug('Decoding '+fullBuf.toString('hex'));
        var code = fullBuf[0];
        var decoder = types.decoders[code];
        if (!decoder) {
            throw new exceptions.MalformedPayloadError('Unknown code: 0x' + code.toString(16));
        } else {
            return decoder(fullBuf.slice(1));
        }
    }

    var buf = new Buffer(cbuf.length);
    cbuf.copy(buf);
    debug('0x' + buf.toString('hex') + ' failed to match any valid buffer');
    return undefined;
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

/**
 * Encode the given value as an AMQP 1.0 bitstring.
 *
 * @param val
 * @param buf
 * @param offset
 * @param {string} [forceType]          If set, forces the encoder for the given type.
 * @returns N/A
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
                    if (Math.abs(val) < 2 << 32) {
                        typeName = 'int';
                    } else {
                        typeName = 'long';
                    }
                } else {
                    // TODO: float vs. double
                }
            }
            encoder = types.encoders[typeName];
            if (!encoder) throw new exceptions.NotImplementedError('encode('+typeName+')');
            return encoder(val, buf, offset);

        case 'object':
            throw new exceptions.NotImplementedError('encode(object)');

        default:
            throw new exceptions.NotImplementedError('encode('+type+')');
    }
};

module.exports = new Codec();
