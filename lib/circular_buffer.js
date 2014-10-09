var butils  = require('butils'),
    debug   = require('debug')('CircularBuffer');

/**
 * Started this before I found cbarrick's version.  Keeping it around in case his doesn't work out.
 *
 * @param initialSize
 * @constructor
 */
var CircularBuffer = function(initialSize) {
    this.size = initialSize || 1024;
    this.buffer = new Buffer(this.size);
    this.start = 0;
    this.end = 0;
};

CircularBuffer.prototype.remaining = function() {

};

CircularBuffer.prototype.resize = function(newSize) {
    var newBuf = new Buffer(newSize);
    if (this.end > this.start) {
        this.buffer.copy(newBuf, 0, this.start, this.end);
    } else {
        this.buffer.copy(newBuf, 0, this.start, this.size);
        this.buffer.copy(newBuf, this.size - this.start, 0, this.end);
    }
    this.size = newSize;
    this.buffer = newBuf;
};

CircularBuffer.prototype.append = function(buffer) {
    if (this.remaining() < buffer.length) {
        var newSize = this.size * 2 < (buffer.length + this.size) ? (buffer.length + this.size) : this.size * 2;
        this.resize(newSize);
    }

    if (buffer.length > (this.size - this.end)) {
        // Break up copy.
        var firstLen = (this.size - this.end);
        var secondLen = buffer.length - firstLen;
        buffer.copy(this.buffer, this.start, 0, firstLen);
        buffer.copy(this.buffer, 0, firstLen);
        this.end = secondLen;
    } else {
        buffer.copy(this.buffer, this.start);
        this.start += buffer.length;
    }
};