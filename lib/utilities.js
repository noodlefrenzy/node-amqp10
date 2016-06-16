'use strict';
var _ = require('lodash'),
    Int64 = require('node-int64'),
    uuid = require('uuid'),
    errors = require('./errors'),
    utilities = module.exports = {};

// lodash aliases
utilities.defaults = _.defaultsDeep;
utilities.includes = _.includes;
utilities.isObject = _.isObject;
utilities.isNumber = _.isNumber;
utilities.values = _.values;
utilities.merge = _.merge;
utilities.clone = _.cloneDeep;

/**
 * Encodes given value into node-amqp-encoder format.
 *
 * @param val
 */
function encode(val) {
  if (val === null) return null;
  if (val.getValue && typeof val.getValue === 'function') return val.getValue();
  return val;
}

utilities.encode = encode;


/**
 * Simple, *light-weight* function for coalescing an argument with a default.
 * Differs from _??_ by operating *only* on undefined, and not on null/zero/empty-string/emtpy-array/etc.
 *
 * Could use _args_ and slice and work for arbitrary length argument list, but that would no longer be simple.
 *
 * @param arg1
 * @param arg2
 * @return arg2 if arg1 === undefined, otherwise arg1
 */
function onUndef(arg1, arg2) {
  return arg1 === undefined ? arg2 : arg1;
}

utilities.onUndef = onUndef;

utilities.orNull = function(arg1) { return onUndef(arg1, null); };

utilities.orFalse = function(arg1) { return onUndef(arg1, false); };


/**
 * Convenience methods for operating against DescribedType list payloads.
 */
utilities.payload = {
  assert: function(p, idx, argName) {
    if (p.value === undefined || p.value[idx] === undefined) {
      throw new errors.MalformedPayloadError('Missing required payload field ' + argName + ' at index ' + idx);
    }
  },
  get: function(p, idx) {
    return p.value === undefined ? undefined : p.value[idx];
  },
  onUndef: function(p, idx, arg2) {
    return p.value === undefined ? arg2 : (p.value[idx] === undefined ? arg2 : p.value[idx]);
  },
  orNull: function(p, idx) {
    return p.value === undefined ? null : (p.value[idx] === undefined ? null : p.value[idx]);
  },
  orFalse: function(p, idx) {
    return p.value === undefined ? false : (p.value[idx] === undefined ? false : p.value[idx]);
  }
};

utilities.contains = function(arr, elt) {
  var result = false;
  if (arr && arr.length) {
    arr.forEach(function (arrElt) {
      if (arrElt === elt) result = true;
    });
  }
  return result;
};

function bufferEquals(lhs, rhs, offset1, offset2, size) {
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

utilities.bufferEquals = bufferEquals;

// @todo: this "parsing" should be far more rigorous
utilities.parseLinkAddress = function(address, policy) {
  if (policy && !policy.defaultSubjects) {
    return { name: address };
  }

  var parts = address.split('/');
  var result = { name: parts.shift() };
  if (parts.length) result.subject = parts.shift();
  return result;
};

function deepMerge() {
  var args = Array.prototype.slice.call(arguments);
  var helper = function(tgt, src, key) {
    var s2, t2;
    if (key === undefined) {
      t2 = tgt;
      s2 = src;
    } else {
      if (!tgt[key]) {
        tgt[key] = new src[key].constructor();
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

function coerce(val, T) {
  if (val === null || val === undefined) return null;
  if (val instanceof T) return val;
  if (val instanceof Int64 && T === Buffer) return val.toBuffer();

  if (val instanceof Array) {
    // Is there really no way to bind the second argument to a fn?
    return val.map(function(v) { return coerce(v, T); });
  }

  return new T(val);
}

utilities.coerce = coerce;

/**
 * Convenience method to assert that a given options object contains the required arguments.
 *
 * @param options
 * @param argnames
 */
function assertArguments(options, argnames) {
  if (!argnames) return;
  if (!options) throw new errors.ArgumentError(argnames);
  argnames.forEach(function (argname) {
    if (!options.hasOwnProperty(argname)) {
      throw new errors.ArgumentError(argname);
    }
  });
}

utilities.assertArguments = assertArguments;

function assertArgument(arg, argname) {
  if (arg === undefined) throw new errors.ArgumentError(argname);
}

utilities.assertArgument = assertArgument;

function range(start, end) {
  var result = [],
  c = end - start + 1;
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
    policyOverrides.name : address + '_' + uuid.v4());
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


// NOTE: this is to get around cyclic dependencies, obviously not the right
//       place for this to live
var AMQPError = require('./types/amqp_error');
utilities.wrapProtocolError = function(err) {
  if (err instanceof AMQPError)
    return new errors.ProtocolError(err.condition, err.description, err.info);
  return err;
};
