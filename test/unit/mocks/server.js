'use strict';
var _ = require('lodash'),
    Promise = require('bluebird'),
    net = require('net'),
    expect = require('chai').expect,
    debug = require('debug')('amqp10:mock:server'),

    FrameBase = require('../../../lib/frames/frame'),
    SaslFrame = require('../../../lib/frames/sasl_frame').SaslFrame,

    tu = require('../testing_utils');

function MockServer(options) {
  this._server = null;
  this._client = null;
  this._responses = [];
  this._expectedFrames = [];

  _.defaults(this, options, {
    hostname: '0.0.0.0',
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

MockServer.prototype.setup = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.server = net.createServer(function(c) {
      debug('connection established');
      self._client = c;

      if (self.serverGoesFirst) {
        self._sendNextResponse();
      }

      c.on('end', function() {
        debug('connection terminated');
        self._client = undefined;
      });

      c.on('data', function(d) {
        debug('read: ', d.toString('hex'));
        if (self._expectedFrames.length) {
          var expectedFrame = self._expectedFrames.shift();
          if (!!expectedFrame) {
            debug('check: ' + expectedFrame.toString('hex'));
            expect(d).to.eql(expectedFrame);
          }
        }

        self._sendNextResponse();
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
  if (frame instanceof FrameBase.AMQPFrame ||
      frame instanceof SaslFrame) {
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
  console.log(this._expectedFrames[0].toString('hex'));
};

MockServer.prototype.setResponseSequence = function(responses) {
  this._responses = responses.map(convertSequenceFramesToBuffers);
};

MockServer.prototype._sendNextResponse = function() {
  var self = this,
      response = this._responses.shift();

  if (Array.isArray(response)) {
    response.forEach(function(r) { self._sendResponse(r); });
  } else {
    self._sendResponse(response);
  }
};

MockServer.prototype._sendResponse = function(response) {
  if (!response) {
    debug('no data to send');
    return;
  }

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
