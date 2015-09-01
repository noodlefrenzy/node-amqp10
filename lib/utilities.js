'use strict';

var _ = require('lodash'),
    debug = require('debug')('amqp10:utilities'),

    constants = require('./constants'),
    errors = require('./errors'),

    uuid = require('uuid'),
    utilities = module.exports = {};


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

// Constants
var addressRegex = new RegExp('^(amqps?)://([^:/]+)(?::([0-9]+))?(/.*)?$');
var addressWithCredentialsRegex = new RegExp('^(amqps?)://([^:]+):([^@]+)@([^:/]+)(?::([0-9]+))?(/.*)?$');

function getPort(port, protocol) {
  if (port) {
    var asFloat = parseFloat(port);
    if (!isNaN(asFloat) && isFinite(port) && (port % 1 === 0)) {
      return asFloat;
    } else {
      throw new Error('Invalid port: ' + port);
    }
  } else {
    switch (protocol) {
      case 'amqp':
        return constants.defaultPort;
      case 'amqps':
        return constants.defaultTlsPort;
      default:
        throw new Error('Unknown Protocol ' + protocol);
    }
  }
}

function parseAddress(address) {
  var results = addressWithCredentialsRegex.exec(address);
  if (results) {
    results = {
      protocol: results[1],
      user: decodeURIComponent(results[2]),
      pass: decodeURIComponent(results[3]),
      host: results[4],
      port: getPort(results[5], results[1]),
      path: results[6] || '/'
    };
    results.rootUri = results.protocol + '://' + results.user + ':' + results.pass + '@' + results.host + ':' + results.port;
  } else {
    results = addressRegex.exec(address);
    if (results) {
      results = {
        protocol: results[1],
        host: results[2],
        port: getPort(results[3], results[1]),
        path: results[4] || '/'
      };
      results.rootUri = results.protocol + '://' + results.host + ':' + results.port;
    }
  }

  if (results) return results;

  throw new Error('Failed to parse ' + address);
}

utilities.parseAddress = parseAddress;

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
  return ((!!policyOverrides && !!policyOverrides.name) ?
    policyOverrides.name : address + '_' + uuid.v4());
};


/**
 * Assign properties given to dest IFF they are defined in source
 */
utilities.assignDefined = function(dest, source, properties) {
  var propertiesToAssign = _.omit(properties, function(value, key) {
    return _.isNull(source[key]) || _.isUndefined(source[key]);
  });

  _.assign(dest, propertiesToAssign);
};

/**
 * Extract values for a DescribedType based on that types EncodeOrdering
 */
utilities.extractDescribedType = function(Type, value, defaults) {
  defaults = defaults || {};

  var result = {},
      ordering = Type.prototype.EncodeOrdering;
  for (var i = 0; i < value.length; i++) {
    result[ordering[i]] = value[i];
  }

  if (defaults === undefined)
    return result;
  return _.defaults(result, defaults);
};

/**
 * Extract values for a DescribedType based on that types EncodeOrdering and
 * assigns the values to the passed in instance
 */
utilities.assignDescribedTypeFromPayload = function(Type, instance, payload, defaults) {
  defaults = defaults || {};
  var ordering = Type.prototype.EncodeOrdering;
  for (var i = 0; i < payload.value.length; i++) {
    instance[ordering[i]] = payload.value[i];
  }

  if (defaults !== undefined)
    _.defaults(instance, defaults);     // NOTE: this mutates the instance
};
