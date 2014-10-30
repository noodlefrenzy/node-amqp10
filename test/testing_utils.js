var builder     = require('buffer-builder'),
    CBuffer     = require('cbarrick-circular-buffer');

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
