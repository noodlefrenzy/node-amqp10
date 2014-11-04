/**
 * Encoding for AMQP Symbol type, to differentiate from strings.  More terse than ForcedType.
 *
 * @param {String} str  Symbol contents
 * @constructor
 */
var Symbol = function(str) {
    this.contents = str;
};

module.exports = Symbol;
