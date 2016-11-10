'use strict';

/**
 * Encoding for AMQP Arrays - homogeneous typed collections.  Provides the CODE for the element type.
 *
 * @param {Array} arr           Array contents, should be encode-able to the given code type.
 * @param {Number} elementType  BYTE code-point for the array values (e.g. 0xA1).
 * @constructor
 */
function AMQPArray(arr, elementType) {
  this.array = arr;
  this.elementType = elementType;
}

module.exports.Array = AMQPArray;
