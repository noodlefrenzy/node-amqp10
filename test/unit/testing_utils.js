'use strict';

var Builder = require('buffer-builder'),
    BufferList = require('bl'),
    expect = require('chai').expect,
    _ = require('lodash'),
    sb = require('stream-buffers');

function buildBuffer(contents) {
  var bufb = new Builder();
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
  if (actual instanceof Builder) {
    actual = actual.get();
  }
  if (expected instanceof Array) {
    expected = buildBuffer(expected);
  }

  var expectedStr = expected.toString('hex');
  var actualStr = actual.toString('hex');
  if (actualStr.length > 100) {
    // If too long, check length first.
    expect(actualStr.length).to.eql(expectedStr.length,
        msg + '\nActual:   ' + (actualStr.length > 100 ? actualStr.substring(0, 100) + '...' : actualStr) +
            ' vs.  \nExpected: ' + (expectedStr.length > 100 ? expectedStr.substring(0, 100) + '...' : expectedStr));
  }
  if (msg) {
    expect(actualStr).to.eql(expectedStr, msg);
  } else {
    expect(actualStr).to.eql(expectedStr);
  }
}

module.exports.shouldBufEql = shouldBufEql;

module.exports.assertTransitions = function(expectedTransitions, callback) {
  var actualTransitions = [];
  return function(event, oldState, newState) {
    if (_.isEmpty(actualTransitions)) actualTransitions.push(oldState);
    actualTransitions.push(newState);

    if (_.isEqual(actualTransitions, expectedTransitions)) {
      callback(actualTransitions);
    }

    // @todo: should we display incorrect states?
  };
};

module.exports.convertFrameToBuffer = function(frame) {
  var buffer = new sb.WritableStreamBuffer();
  frame.write(buffer);
  return buffer.getContents();
};
