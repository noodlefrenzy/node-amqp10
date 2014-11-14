var builder     = require('buffer-builder'),
    CBuffer     = require('cbarrick-circular-buffer')
    should      = require('should');

function newBuf(contents) {
    var bufb = new builder();
    for (var idx = 0; idx < contents.length; idx++) {
        var cur = contents[idx];
        if (typeof cur === 'function') {
            cur.call(bufb, contents[++idx]);
        } else {
            bufb.appendUInt8(cur);
        }
    }
    return bufb.get();
}

module.exports.newBuf = newBuf;

function newCBuf(contents) {
    var buf = newBuf(contents);
    var cbuf = new CBuffer({ size: buf.length, encoding: 'buffer' });
    cbuf.write(buf);
    return cbuf;
}

module.exports.newCBuf = newCBuf;

function shouldBufEql(expected, actual, msg) {
    msg = msg ? msg + ': ' : msg;
    if (actual instanceof builder) {
        actual = actual.get();
    }
    if (expected instanceof Array) {
        expected = newBuf(expected);
    }

    var expectedStr = expected.toString('hex');
    var actualStr = actual.toString('hex');
    if (actualStr.length > 100) {
        // If too long, check length first.
        actualStr.length.should.eql(expectedStr.length, msg + 'Actual: ' + (actualStr.length > 100 ? actualStr.substring(0, 100) + '...' : actualStr) +
            ' vs. Expected: ' + (expectedStr.length > 100 ? expectedStr.substring(0,100) + '...' : expectedStr));
    }
    if (msg) {
        actualStr.should.eql(expectedStr, msg);
    } else {
        actualStr.should.eql(expectedStr);
    }
}

module.exports.shouldBufEql = shouldBufEql;
