'use strict';
var _ = require('lodash'),
    //errors = require('./errors'),
    crypto = require('crypto');

var utilities = module.exports = {};

// lodash aliases
utilities.defaults = _.defaultsDeep;
utilities.includes = _.includes;
utilities.isObject = _.isObject;
utilities.isNumber = _.isNumber;
utilities.values = _.values;
utilities.merge = _.merge;
utilities.clone = _.cloneDeep;

function bufferEqualsLegacy(lhs, rhs, offset1, offset2, size) {
  if (offset1 === undefined && offset2 === undefined && size === undefined) {
    if (lhs.length !== rhs.length) return false;
  }
  var slice1 = (offset1 === undefined && size === undefined) ? lhs : lhs.slice(offset1 || 0, size || lhs.length);
  var slice2 = (offset2 === undefined && size === undefined) ? rhs : rhs.slice(offset2 || 0, size || rhs.length);
  for (var idx = 0; idx < slice1.length; ++idx) {
    if (slice1[idx] !== slice2[idx]) return false;
  }
  return true;
}

function bufferEquals(lhs, rhs) {
  return lhs.compare(rhs) === 0;
}

utilities.bufferEquals =
  (typeof Buffer.compare === 'function') ? bufferEquals: bufferEqualsLegacy;

function deepMerge() {
  var args = Array.prototype.slice.call(arguments);
  var helper = function(tgt, src, key) {
    var s2, t2;
    if (key === undefined) {
      t2 = tgt;
      s2 = src;
    } else {
      if (!tgt[key]) {
        if (src[key] instanceof Buffer) {
          tgt[key] = new Buffer(src[key]);
        } else {
          tgt[key] = new src[key].constructor();
        }
      }
      t2 = tgt[key];
      s2 = src[key];
    }

    for (var k2 in s2) {
      if (s2.hasOwnProperty(k2)) {
        var v2 = s2[k2];
        if (v2 !== null && typeof v2 === 'object') {
          helper(t2, s2, k2);
        } else {
          t2[k2] = s2[k2];
        }
      }
    }
  };

  var merged = null;
  for (var idx = args.length - 1; idx >= 0; --idx) {
    var curObj = args[idx];
    if (merged === null) {
      merged = curObj.constructor();
    }
    helper(merged, curObj);
  }
  return merged;
}

utilities.deepMerge = deepMerge;
utilities.deepCopy = deepMerge;

/**
 * Convenience method to assert that a given options object contains the required arguments.
 *
 * @param options
 * @param argnames
 */
function assertArguments(options, argnames) {
  if (!argnames) return;
  if (!options) throw new TypeError('missing arguments: ' + argnames);
  argnames.forEach(function (argname) {
    if (!options.hasOwnProperty(argname)) {
      throw new TypeError('missing argument: ' + argname);
    }
  });
}

utilities.assertArguments = assertArguments;

function assertArgument(arg, argname) {
  if (arg === undefined) throw new TypeError('missing argument: ' + argname);
}

utilities.assertArgument = assertArgument;

function range(start, end) {
  var result = [], c = end - start + 1;
  while(c--) result[c] = end--;
  return result;
}

utilities.generateTimeouts = function(options) {
  if (options.strategy === 'exponential')
    return range(0, options.retries - 1)
      .map(function(i) { return Math.pow(2, i) * 1000; });

  // default to fibonacci
  return range(0, options.retries - 1)
    .reduce(function(result, value, idx) {
      if (idx === 0) {
        result.push(0);
      } else if (idx === 1) {
        result.push(1);
      } else {
        result.push((result[idx - 2] + result[idx - 1]));
      }

      return result;
    }, [])
    .map(function(i) { return i * 1000; });
};

/**
 * Calculates the start and end for a disposition frame
 *
 * @param message    either a single message or an array of them
 * @return {Object}
 */
utilities.dispositionRange = function(message) {
  var first, last;
  if (_.isArray(message)) {
    first = message[0]._deliveryId;
    last = message[message.length - 1]._deliveryId;
  } else {
    first = last = message._deliveryId;
  }

  return {
    first: first,
    last: last
  };
};

/**
 * Generates a link name for a given address
 *
 * @param address             link address
 * @param [policyOverrides]   link creation policy overrides
 * @return {String}
 */
utilities.linkName = function(address, policyOverrides) {
  var name = ((!!policyOverrides && !!policyOverrides.name) ?
    policyOverrides.name : address + '_' + uuidV4());
  if (policyOverrides.hasOwnProperty('attach') &&
      policyOverrides.attach.hasOwnProperty('source') &&
      policyOverrides.attach.source.hasOwnProperty('dynamic') &&
      policyOverrides.attach.source.dynamic === true) {
    name = 'dynamic' + name;
  }

  return name;
};

utilities.camelCase = function(name) {
  return name.toLowerCase()
    .replace(/[-_:]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/ (.)/g, function($1) { return $1.toUpperCase(); })
    .replace(/ /g, '' );
};

// Maps for number <-> hex string conversion
var BYTE_TO_HEX = [];
var HEX_TO_BYTE = {};
for (var i = 0; i < 256; i++) {
  BYTE_TO_HEX[i] = (i + 0x100).toString(16).substr(1);
  HEX_TO_BYTE[BYTE_TO_HEX[i]] = i;
}

function parseUuid(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;
  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = HEX_TO_BYTE[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

function unparseUuid(buf, offset) {
  var i = offset || 0;
  return  BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]] +
          BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]] + '-' +
          BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]] + '-' +
          BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]] + '-' +
          BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]] + '-' +
          BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]] +
          BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]] +
          BYTE_TO_HEX[buf[i++]] + BYTE_TO_HEX[buf[i++]];
}

function uuidV4() {
  var data = crypto.randomBytes(16);
  data[6] = (data[6] & 0x0f) | 0x40;
  data[8] = (data[8] & 0x3f) | 0x80;
  return unparseUuid(data);
}

utilities.parseUuid = parseUuid;
utilities.unparseUuid = unparseUuid;
utilities.uuidV4 = uuidV4;
