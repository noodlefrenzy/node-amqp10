var debug       = require('debug')('amqp10-utilities'),
    constants   = require('./constants'),
    exceptions  = require('./exceptions');

/**
 * Simple, *light-weight* function for coalescing an argument with a default.
 * Differs from _??_ by operating *only* on undefined, and not on null/zero/empty-string/emtpy-array/etc.
 *
 * Could use _args_ and slice and work for arbitrary length argument list, but that would no longer be simple.
 *
 * @param arg1
 * @param arg2
 * @returns arg2 if arg1 === undefined, otherwise arg1
 */
function onUndef(arg1, arg2) {
    return arg1 === undefined ? arg2 : arg1;
}

module.exports.onUndef = onUndef;

module.exports.orNull = function(arg1) { return onUndef(arg1, null); };

module.exports.orFalse = function(arg1) { return onUndef(arg1, false); };

/**
 * Adds missing values to map from defaultMap.  Mutates input.
 *
 * @param map
 * @param defaultMap
 * @returns map to allow for chaining.
 */
function orDefaults(map, defaultMap) {
    var result = map || {};
    for (var key in defaultMap) {
        if (result[key] === undefined) {
            result[key] = defaultMap[key];
        }
    }
    return result;
}

module.exports.orDefaults = orDefaults;

/**
 * Convenience methods for operating against DescribedType list payloads.
 */
module.exports.payload = {
    assert: function(p, idx, argName) {
        if (p.value === undefined || p.value[idx] === undefined) {
            throw new exceptions.MalformedPayloadError('Missing required payload field '+argName+' at index '+idx);
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

module.exports.contains = function(arr, elt) {
    if (arr && arr.length) {
        for (var idx in arr) {
            if (arr[idx] === elt) return true;
        }
    }
    return false;
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

module.exports.bufferEquals = bufferEquals;

// Constants
var addressRegex = new RegExp('^(amqps?)://([^:/]+)(?::([0-9]+))?(/.*)?$');
var addressWithCredentialsRegex = new RegExp('^(amqps?)://([^:]+):([^@]+)@([^:/]+)(?::([0-9]+))?(/.*)?$');

function getPort(port, protocol) {
    if (port) {
        var asFloat = parseFloat(port);
        if (!isNaN(asFloat) && isFinite(port) && (port % 1 === 0)) {
            return asFloat;
        } else {
            throw new Error('Invalid port: '+port);
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
        return {
            protocol: results[1],
            user: results[2],
            pass: results[3],
            host: results[4],
            port: getPort(results[5], results[1]),
            path: results[6] || '/'
        };
    } else {
        results = addressRegex.exec(address);
        if (results) {
            return {
                protocol: results[1],
                host: results[2],
                port: getPort(results[3], results[1]),
                path: results[4] || '/'
            };
        }
    }

    throw new Error('Failed to parse ' + address);
}

module.exports.parseAddress = parseAddress;
