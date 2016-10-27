'use strict';

var Int64 = require('node-int64'),

    AMQPArray = require('./types/amqp_composites').Array,
    DescribedType = require('./types/described_type'),
    ForcedType = require('./types/forced_type'),

    types = require('./types'),
    errors = require('./errors'),
    u = require('./utilities');

/**
 * Build a codec.
 *
 * @constructor
 */
var Codec = function() {};
Codec.prototype._peek = function(buf, offset, numBytes) {
  return buf.slice(offset, offset + numBytes);
};

Codec.prototype._read = function(buf, offset, numBytes) {
  return buf.slice(offset, offset + numBytes);
};

Codec.prototype._readOrPeekFixed = function(buf, offset, remaining, doNotConsume, numBytes) {
  var reader = doNotConsume ? this._peek : this._read;
  return remaining >= numBytes ?
    [ reader(buf, offset, numBytes), numBytes ] : undefined;
};

/**
 * Reads a full value's worth of bytes from a circular or regular buffer, or returns undefined if not enough bytes are there.
 * Note that for Buffers, the returned Buffer will be a slice (so backed by the original storage)!
 *
 * @param {Buffer|CBuffer} buf              Buffer or circular buffer to read from.  If a Buffer is given, it is assumed to be full.
 * @param {integer} [offset=0]              Offset - only valid for Buffer, not CBuffer.
 * @param {boolean} [doNotConsume=false]    If set to true, will peek bytes instead of reading them - useful for leaving
 *                                          circular buffer in original state for described values that are not yet complete.
 * @param {Number} [forcedCode]             If given, first byte is not assumed to be code and given code will be used - useful for arrays.
 * @return {Array}                         Buffer of full value + number of bytes read.
 *                                          For described types, will return [ [ descriptor-buffer, value-buffer ], total-bytes ].
 * @private
 */
Codec.prototype._readFullValue = function(buf, offset, doNotConsume, forcedCode) {
  offset = offset || 0;
  var remaining = buf.length - offset;
  if (remaining < 1) return undefined;

  var code = forcedCode;
  var codeBytes = 0;
  if (code === undefined) {
    code = this._peek(buf, offset, 1)[0];
    codeBytes = 1;
  }

  // Constructor - need to read two full values back to back of unknown size.  (╯°□°）╯︵ ┻━┻
  if (code === 0x00) {
    var val1 = this._readFullValue(buf, offset + codeBytes, true);
    if (val1 !== undefined) {
      var val2 = this._readFullValue(buf, offset + codeBytes + val1[1], true);
      if (val2 !== undefined) {
        var totalBytes = val1[1] + val2[1] + codeBytes;
        return [[val1[0], val2[0]], totalBytes];
      }
    }

    return undefined;
  }

  var codePrefix = code & 0xF0;
  var codeAndLength, numBytes;
  switch (codePrefix) {
    case 0x40: return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, 0 + codeBytes);
    case 0x50: return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, 1 + codeBytes);
    case 0x60: return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, 2 + codeBytes);
    case 0x70: return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, 4 + codeBytes);
    case 0x80: return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, 8 + codeBytes);
    case 0x90: return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, 16 + codeBytes);
    case 0xA0:
    case 0xC0:
    case 0xE0:
      if (remaining < 2) return undefined;
      codeAndLength = this._peek(buf, offset, codeBytes + 1);
      numBytes = codeAndLength[codeBytes] + 1 + codeBytes; // code + size + # octets
      //debug('Reading variable with prefix 0x'+codePrefix.toString(16)+' of length '+numBytes);
      return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, numBytes);
    case 0xB0:
    case 0xD0:
    case 0xF0:
      if (remaining < 5) return false;
      codeAndLength = this._peek(buf, offset, codeBytes + 4);
      numBytes = codeAndLength.readUInt32BE(codeBytes) + 4 + codeBytes; // code + size + #octets
      //debug('Reading variable with prefix 0x'+codePrefix.toString(16)+' of length '+numBytes);
      return this._readOrPeekFixed(buf, offset, remaining, doNotConsume, numBytes);
    default:
      throw new errors.MalformedPayloadError('Unknown code prefix: 0x' + codePrefix.toString(16));
  }
};

Codec.prototype._asMostSpecific = function(buf, forcedCode) {
  if (buf instanceof Array) {
    // Described type
    var descriptor = this._asMostSpecific(buf[0]);
    var value = this._asMostSpecific(buf[1]);
    var describedType = new DescribedType(descriptor, value);
    return describedType;
  }

  var code = forcedCode || buf[0];
  if (!types.hasOwnProperty(code)) {
    throw new errors.MalformedPayloadError('Unknown code: 0x' + code.toString(16));
  }

  var decoder = types[code];
  var valBytes = forcedCode ? buf : buf.slice(1);
  return decoder.decode(valBytes, this);
};


/**
 * Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.
 *
 * @param {Buffer|CBuffer} buf          The buffer/circular buffer to decode.  Will decode a single value per call.
 * @param {Number} [offset=0]           The offset to read from (only used for Buffers).
 * @param {Number} [forcedCode]         If given, will not consume first byte for code and will instead use this as the code. Useful for arrays.
 * @return {Array}                      Single decoded value + number of bytes consumed.
 */
Codec.prototype.decode = function(buf, offset, forcedCode) {
  offset = offset || 0;
  forcedCode = forcedCode || undefined;

  var fullBuf = this._readFullValue(buf, offset, /* doNotConsume= */false, forcedCode);
  if (fullBuf) {
    var bufVal = fullBuf[0];
    var numBytes = fullBuf[1];
    var value = this._asMostSpecific(bufVal, forcedCode);
    return [value, numBytes];
  }

  /** @todo: debug unmatched */
  return undefined;
};


/**
 * Encode the given value as an AMQP 1.0 bitstring.
 *
 * We do a best-effort to determine type.  Objects will be encoded as <code>maps</code>, unless:
 * + They are DescribedTypes, in which case they will be encoded as such.
 * + They are Int64s, in which case they will be encoded as <code>longs</code>.
 *
 * @param value                         Value to encode.
 * @param {builder} buffer              buffer-builder to write into.
 * @param {string} [forceType]          If set, forces the encoder for the given type.
 */
Codec.prototype.encode = function(value, buffer, forceType) {
  // Special-case null values
  if (value === null) {
    return types.null.encode(value, buffer);
  }

  if (!!forceType) {
    // @todo: this will unfortunately cause a deoptimization of the method
    //        until at least node 4.2.1, because v8 will assume that lookups
    //        by keyed value are done with a Number rather than a String
    if (!types.hasOwnProperty(forceType)) throw new errors.EncodingError(forceType, 'unknown type ' + forceType);
    var encoder = types[forceType];
    if (!encoder.encode) {
      throw new errors.NotImplementedError('encode(' + forceType + ')');
    }

    return encoder.encode(value, buffer, this);
  }

  switch (typeof value) {
    case 'boolean': return types.boolean.encode(value, buffer);
    case 'string': return types.string.encode(value, buffer);
    case 'function': return this.encode(value(), buffer, forceType);
    case 'object': return this._encodeObject(value, buffer);
    case 'number': return this._encodeNumber(value, buffer);
    default:
      throw new errors.NotImplementedError('encode(' + (typeof value) + ')');
  }
};

Codec.prototype._encodeNumber = function(value, buffer) {
  if (isNaN(value) || !isFinite(value)) {
    throw new errors.EncodingError(value, 'value is not a finite number');
  }

  if (Math.floor(value) - value !== 0) {
    return types.double.encode(value, buffer);
  } else if (value >= 0) {
    if (value <= 0xFFFFFFFF)
      return types.uint.encode(value, buffer);
    return types.ulong.encode(value, buffer);
  }

  if (Math.abs(value) <= 0xFFFFFFFF)
    return types.int.encode(value, buffer);
  return types.long.encode(value, buffer);
};

Codec.prototype._encodeObject = function(value, buffer) {
  if (value instanceof DescribedType) {
    buffer.appendUInt8(0x00);

    // NOTE: Described type constructors are either ulongs or a symbol. Here
    //       we are checking if the passed in value is a number and forcing a
    //       ulong encoding. For everything else we attempt to encode as a symbol.
    var descriptor = (value.descriptor instanceof ForcedType) ? value.descriptor.value : value.descriptor;
    var descriptorEncoder =
      (typeof descriptor === 'number') ? types.ulong : types.symbol;
    descriptorEncoder.encode(descriptor, buffer);
    var describedValue = value.getValue();
    describedValue = (!!describedValue || u.isNumber(describedValue)) ? describedValue : [];
    this.encode(describedValue, buffer);
    return;
  }

  // support for composite types
  if (value.toDescribedType && typeof value.toDescribedType === 'function') {
    return this.encode(value.toDescribedType() || [], buffer);
  }

  if (value instanceof Buffer) return types.binary.encode(value, buffer, this);
  if (value instanceof AMQPArray) return types.array.encode(value, buffer, this);
  if (value instanceof Array) return types.list.encode(value, buffer, this);
  if (value instanceof Date) return types.timestamp.encode(new Int64(value.getTime()), buffer, this);
  if (value instanceof ForcedType) return this.encode(value.value, buffer, value.typeName);

  var encoder;
  if (value instanceof Int64) {
    encoder = (value < 0) ? types.long.encode : types.ulong.encode;
    return encoder(value, buffer, this);
  }

  if (value.encode && (typeof value.encode === 'function')) {
    return value.encode(this, buffer);
  }

  return types.map.encode(value, buffer, this);
};

module.exports = new Codec();
