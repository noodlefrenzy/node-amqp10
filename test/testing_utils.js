'use strict';
var Builder = require('buffer-builder'),
    BufferList = require('bl'),
    expect = require('chai').expect,
    _ = require('lodash'),
    sb = require('stream-buffers'),
    frames = require('../lib/frames');

function populateConfig(configKeyMap, cb) {
  var processVersion = process.version;
  expect(process.env.ValidProcessVersions, 'Missing env ValidProcessVersions').to.exist;
  Object.keys(configKeyMap).forEach(function (k) {
    expect(process.env[configKeyMap[k]], 'Missing env ' + k).to.exist;
  });
  var versions = process.env.ValidProcessVersions.split('|').map(function(x) { return new RegExp(x, 'i'); });
  var idx = 0;
  for (var i = 0; i < versions.length; ++i) {
    var v = versions[i];
    if (v.test(processVersion)) {
      idx = i;
      break;
    }
  }

  var config = {};
  for (var key in configKeyMap) {
    var configEnv = configKeyMap[key];
    var configVals = process.env[configEnv].split('|');
    // If only one value, assume it applies across all process versions.
    config[key] = configVals.length === 1 ? configVals[0] : configVals[idx];
  }

  return !!cb ? cb(config) : config;
}

module.exports.populateConfig = populateConfig;

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
  frames.writeFrame(frame, buffer);
  return buffer.getContents();
};
