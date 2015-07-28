'use strict';
var _ = require('lodash'),
    Promise = require('bluebird'),
    BufferList = require('bl'),
    net = require('net'),

    debug = require('debug')('amqp10:mock:server'),

    FrameBase = require('../../../lib/frames/frame'),
    SaslFrame = require('../../../lib/frames/sasl_frame').SaslFrame,

    tu = require('../testing_utils');


function MockServer(options) {
  this._server = null;
  this._client = null;
  this._responses = [];

  _.defaults(this, options, {
    port: 4321,
    serverGoesFirst: false
  });
}

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
        self._sendNextResponse();
      });
    });

    self.server.on('error', function(err) {
      reject(err);
    });

    self.server.listen(self.port, function() {
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

MockServer.prototype.setResponseSequence = function(responses) {
  this._responses = responses.map(convertSequenceFramesToBuffers);
};

MockServer.prototype._sendNextResponse = function() {
  var self = this,
      response = this._responses.unshift();

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
    this._client.write(response);
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
