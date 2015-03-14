'use strict';

var builder = require('buffer-builder'),
    BufferList = require('bl'),
    should = require('should');

function buildBuffer(contents) {
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

module.exports.buildBuffer = buildBuffer;

function newBuffer(contents) {
  var buffer = new BufferList();
  buffer.append(buildBuffer(contents));
  return buffer;
}

module.exports.newBuffer = newBuffer;

function shouldBufEql(expected, actual, msg) {
  msg = msg ? msg + ': ' : '';
  if (actual instanceof builder) {
    actual = actual.get();
  }
  if (expected instanceof Array) {
    expected = buildBuffer(expected);
  }

  var expectedStr = expected.toString('hex');
  var actualStr = actual.toString('hex');
  if (actualStr.length > 100) {
    // If too long, check length first.
    actualStr.length.should.eql(expectedStr.length,
        msg + '\nActual:   ' + (actualStr.length > 100 ? actualStr.substring(0, 100) + '...' : actualStr) +
            ' vs.  \nExpected: ' + (expectedStr.length > 100 ? expectedStr.substring(0, 100) + '...' : expectedStr));
  }
  if (msg) {
    actualStr.should.eql(expectedStr, msg);
  } else {
    actualStr.should.eql(expectedStr);
  }
}

module.exports.shouldBufEql = shouldBufEql;
