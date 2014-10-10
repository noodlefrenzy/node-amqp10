var bitsyntax   = require('bitsyntax'),
    util        = require('util'),
    constants   = require('./constants'),
    debug       = require('debug')('amqp10-Codec');

/**
 * Build a codec, turning constants defining AMQP1.0 types into specific bitsyntax parsers and builders.
 *
 * @constructor
 */
var Codec = function() {
    this.parsersByCode = {};
    this.decodeSuffix = ', rest/binary';
    this.variableParser = '%d:8, len:%d, value:len/%s';
    this.fixedParser = '%d:8, value:%d/%s';
    this.simpleParser = '%d:8';
    for (var tName in constants.types) {
        var t = constants.types[tName];
        var curName = tName.substring(1);
        var parserStr;
        if (t.variable) {
            parserStr = util.format(this.variableParser + this.decodeSuffix, t.code, t.variable, t.type || 'binary');
        } else if (t.length) {
            parserStr = util.format(this.fixedParser + this.decodeSuffix, t.code, t.length, t.type || 'binary');
        } else {
            parserStr = util.format(this.simpleParser + this.decodeSuffix, t.code);
        }
        debug(curName + ': ' + parserStr);
        var curParser = { parser: bitsyntax.parse(parserStr), builder: t.builder, name: curName };
        this.parsersByCode[t.code] = curParser;
    }
};

/**
 * Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.
 *
 * @param {Buffer} buffer   The buffer to decode.
 * @returns {*}             2-elt array of decoded value and "the rest", or undefined if parsing failed.
 */
Codec.prototype.decode = function(buffer) {
    for (var code in this.parsersByCode) {
        var curParser = this.parsersByCode[code];
        var match = bitsyntax.match(curParser.parser, buffer, curParser.env);
        if (match) {
            var built;
            if (match.len) {
                built = curParser.builder ? curParser.builder(match.len, match.value) : match.value;
                //debug('Parsed variable ' + buffer.toString('hex') + ' as ' + built);
                return [ built, match.rest ];
            } else {
                built = curParser.builder ? curParser.builder(match.value) : match.value;
                //debug('Parsed fixed ' + buffer.toString('hex') + ' as ' + built);
                return [ built, match.rest ];
            }
        } else {
            //debug('No match: '+buffer.toString('hex')+' - '+curParser.name);
        }
    }

    debug('Failed to parse ' + buffer.toString('hex'));
    return undefined;
};

Codec.prototype.encode = function(val, buf, offset) {
    var type = typeof val;
    switch (type) {
        case 'string':
            var strbuf = new Buffer(val);
            var encodingType = constants.types._utf8;
            if (strbuf.length > (2 << 8)) {
                encodingType = constants.types._longutf8;
            }
            var stringParser = util.format(this.variableParser, encodingType.code, encodingType.variable, 'binary');
            bitsyntax.write(buf, 0, bitsyntax.parse(stringParser), { len: strbuf.length, value: strbuf });
            break;

        case 'number':
            // TODO: All non-doubles
            var doubleType = constants.types._double;
            var doubleParser = util.format(this.fixedParser, doubleType.code, doubleType.length, doubleType.type);
            bitsyntax.write(buf, 0, bitsyntax.parse(doubleParser), { value: val });
            break;

        case 'object':
            throw new Error('Not yet implemented');
    }
};

module.exports = new Codec();
