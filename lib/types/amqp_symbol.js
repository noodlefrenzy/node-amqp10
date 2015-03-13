/**
 * Encoding for AMQP Symbol type, to differentiate from strings.  More terse than ForcedType.
 *
 * @param {String} str  Symbol contents
 * @constructor
 */
var AMQPSymbol = function(str) {
    this.contents = str;
};

AMQPSymbol.prototype.toString = function() {
    return this.contents;
};

AMQPSymbol.prototype.getValue = function() {
    return ['symbol', this.contents];
};

AMQPSymbol.prototype.encode = function(codec, bufb) {
    var asBuf = new Buffer(this.contents, 'utf8');
    if (asBuf.length > 0xFE) {
        bufb.appendUInt8(0xb3);
        bufb.appendUInt32BE(asBuf.length);
    } else {
        bufb.appendUInt8(0xa3);
        bufb.appendUInt8(asBuf.length);
    }
    bufb.appendBuffer(asBuf);
};

AMQPSymbol.stringify = function(arrOrSym) {
    if (arrOrSym instanceof Array) {
        var result = [];
        for (var idx in arrOrSym) {
            result.push(arrOrSym[idx].contents);
        }
        return result;
    } else return arrOrSym.contents;
};

module.exports = AMQPSymbol;
