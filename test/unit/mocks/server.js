'use strict';
var _ = require('lodash'),
    BufferList = require('bl'),
    Promise = require('bluebird'),
    net = require('net'),
    expect = require('chai').expect,
    debug = require('debug')('amqp10:mock:server'),
    frames = require('../../../lib/frames'),
    tu = require('../../testing_utils'),
    constants = require('../../../lib/constants');

function MockServer(options) {
  this._server = null;
  this._client = null;
  this._responses = [];
  this._expectedFrames = [];
  this._seenFrames = [];

  _.defaults(this, options, {
    hostname: '127.0.0.1',
    port: 4321,
    serverGoesFirst: false
  });
}

MockServer.prototype.address = function(user, pass) {
  if (!this.server) throw new Error('no server');

  var address = 'amqp://';
  if (!!user) address += user;
  if (!!pass) address += ':' + pass;
  if (!!user || !!pass) address += '@';
  address += this.server.address().address + ':' + this.server.address().port;
  return address;
};

MockServer.prototype.closeConnection = function() {
  if (this._client) {
    this._client.end();
  }
};

MockServer.prototype.setup = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.server = net.createServer(function(c) {
      debug('connection established');
      self._client = c;
      self._buffer = new BufferList();

      if (self.serverGoesFirst) {
        self._sendNextResponse();
      }

      c.on('end', function() {
        debug('connection terminated');
        self._client = undefined;
      });

      c.on('data', function(d) {
        debug('read: ', d.toString('hex'));

        // special case for initial headers
        if (tu.bufferEqual(d, constants.amqpVersion) ||
            tu.bufferEqual(d, constants.saslVersion)) {
          self._checkExpectations(d);
          return;
        }

        self._buffer.append(d);
        var checkBuffer = self._buffer.duplicate();
        var frame = frames.readFrame(checkBuffer, { verbose: false });
        if (!frame) return;

        var dataSize = self._buffer.length - checkBuffer.length;
        var data = self._buffer.slice(0, dataSize);
        self._buffer.consume(dataSize);
        self._checkExpectations(data);
      });
    });

    self.server.on('error', function(err) {
      reject(err);
    });

    self.server.listen(self.port, self.hostname, function() {
      debug('server listening on ' + self.port);
      resolve();
    });
  });
};

MockServer.prototype._checkExpectations = function(data) {
  var idx = 0, expectedFrame;
  while (this._expectedFrames.length) {
    expectedFrame = this._expectedFrames.shift();
    if (expectedFrame === null) {
      break;
    }

    if (data.length < idx + expectedFrame.length) {
      this._expectedFrames.unshift(expectedFrame);
      break;
    }

    if (expectedFrame === false || expectedFrame === undefined) break;
    var actualFrame = data.slice(idx, idx + expectedFrame.length);
    debug('expected(', expectedFrame.length, '):', expectedFrame.toString('hex'));
    debug('  actual(', actualFrame.length, '):', actualFrame.toString('hex'));
    expect(actualFrame).to.eql(expectedFrame);
    if (this._expectedFrames[0] === false) break;
    if (idx >= data.length) break;
    idx += expectedFrame.length;
  }

  this._seenFrames.push(new BufferList(data));
  this._sendNextResponse();
};

MockServer.prototype.teardown = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!self._server) resolve();

    self.server.close(function(err) {
      if (!!err) return reject(err);

      debug('server shutting down');
      self.server = undefined;
      resolve();
    });
  });
};

function convertSequenceFramesToBuffers(frame) {
  if (frame instanceof frames.AMQPFrame || frame instanceof frames.SaslFrame) {
    return tu.convertFrameToBuffer(frame);
  } else if (Array.isArray(frame)) {
    return [frame[0], convertSequenceFramesToBuffers(frame[1])];
  }

  return frame;
}

/**
 * These are the frames we expect to receive from the client. You can
 * specify "false" for any given frame to indicate that we don't care
 * what came in (to more readably test a particular frame sequence)
 */
MockServer.prototype.setExpectedFrameSequence = function(expected) {
  this._expectedFrames = expected.map(convertSequenceFramesToBuffers);
};

MockServer.prototype.setResponseSequence = function(responses) {
  this._responses = responses;
};

function isDelay(response) {
  return (typeof response === 'object' && response.hasOwnProperty('delay'));
}

MockServer.prototype._sendNextResponse = function() {
  var self = this,
      response = this._responses.shift();

  if (isDelay(response)) {
    setTimeout(function() { self._sendNextResponse(); }, response.delay);
  } else if (Array.isArray(response)) {
    (function delayableLoop(responses) {
      var r = responses.shift();
      var delay = isDelay(r) ? r.delay : 0;
      setTimeout(function() {
        if (!delay) self._sendResponse(r);
        if (responses.length) delayableLoop(responses);
      }, delay);
    })(response);
  } else {
    self._sendResponse(response);
  }
};

MockServer.prototype._sendResponse = function(response) {
  if (this._client === undefined || this._client === null) {
    return;
  }

  if (!response) {
    debug('no data to send');
    return;
  }

  if (typeof response === 'function') {
    response = response(this._seenFrames);
  }

  response = convertSequenceFramesToBuffers(response);
  if (typeof response !== 'string') {
    this._client.write(response, function() {
      debug('wrote: ', response.toString('hex'));
    });
    return;
  }

  switch(response) {
    case 'disconnect': this._client.end(); break;
    default:
      this._client.write(response, 'utf8', function() {
        debug('wrote: ' + response);
      });
  }
};

module.exports = MockServer;
