'use strict';
var util = require('util');

/**
 * ForcedType coerces the encoder to encode to the given type, regardless of what it might think.
 *
 * @param typeName          Symbolic name or specific code (e.g. 'long', or 0xA0)
 * @param value             Value to encode, should be compatible or bad things will occur
 * @constructor
 */
function ForcedType(typeName, value) {
  this.typeName = typeName;
  this.value = value;
}

ForcedType.prototype.inspect = function(depth) {
  return util.inspect(this.value);
};

ForcedType.prototype.valueOf = function() {
  return this.value;
};

module.exports = ForcedType;
