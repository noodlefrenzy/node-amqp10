var debug   = require('debug')('amqp10-utilities');

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
