/**
 * Encoding for AMQP Symbol type, to differentiate from strings.  More terse than ForcedType.
 *
 * @param {String} str  Symbol contents
 * @constructor
 */
var Symbol = function(str) {
    this.contents = str;
};

Symbol.prototype.toString = function() {
    return this.contents;
};

Symbol.stringify = function(arrOrSym) {
    if (arrOrSym instanceof Array) {
        var result = [];
        for (var idx in arrOrSym) {
            result.push(arrOrSym[idx].contents);
        }
        return result;
    } else return arrOrSym.contents;
};

module.exports = Symbol;
