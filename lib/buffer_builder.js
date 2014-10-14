var builder = require('buffer-builder');

var makeBuffer = function(contents) {
    var buf = new builder();
    for (var idx in contents) {
        var curContents = contents[idx];
        var type = curContents[0];
        var appender = null;
        switch (type) {
            case 'byte':
                appender = buf.appendUInt8;
                break;
            case 'short':
                appender = buf.appendInt16BE;
                break;
            case 'int':
                appender = buf.appendInt32BE;
                break;
            case 'uint':
                appender = buf.appendUInt32BE;
                break;
            case 'string':
                appender = function (s) { return buf.appendString(s, 'utf8'); };
                break;
            case 'buf':
            case 'buffer':
                appender = buf.appendBuffer;
            default:
                throw new Error('Unknown type');
        }

        var values = curContents[1];
        for (var idx in values) {
            var curVal = values[idx];
            appender.call(buf, curVal);
        }
    }

    return buf.get();
};

module.exports = makeBuffer;