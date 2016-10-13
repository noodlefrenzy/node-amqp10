'use strict';

var BufferList = require('bl'),
    debug = require('debug')('amqp10-MockServer'),
    net = require('net'),
    expect = require('chai').expect,
    frames = require('../../lib/frames'),
    tu = require('./../testing_utils');

var MockServer = function(port) {
  this.server = null;
  this.conn = null;
  this.port = port || 4321;
  this.buffer = new BufferList();
  this.requestsExpected = [];
  this.requestIdx = 0;
  this.responsesToSend = [];
  this.responseIdx = 0;
  this.serverGoesFirst = false;
  this.listenAttempts = 0;
  this.client = null;
};

MockServer.prototype._listen = function() {
  var self = this;
  self.listenAttempts++;
  self.server.listen(this.port, function() {
    debug('Server listening on ' + self.port);
  });
};

MockServer.prototype.setup = function(client) {
  if (this.server) {
    this.teardown();
  }

  this.client = client;

  var self = this;
  var connectionHandler = function(c) {
    debug('Connection established');
    self.conn = c;
    if (self.serverGoesFirst) {
      self._sendNext();
    }
    c.on('end', function() { debug('Connection terminated'); });
    c.on('data', function(d) { self.buffer.append(d); self._testData(); });
  };
  self.server = net.createServer(connectionHandler);
  self.server.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
      expect(self.listenAttempts).to.be.lessThan(5, 'Failed to connect too many times');
      debug('Address in use on ' + self.port + ', trying again...');
      self.port++;
      self.server = self._listen();
    } else {
      throw new Error('Error starting mock server: ' + err);
    }
  });
  self._listen();
};

MockServer.prototype.teardown = function() {
  if (this.server) {
    this.server.close(function() { debug('Server shutting down'); });
    this.server = null;
  }
};

function convertSequenceFramesToBuffers(frame) {
  if (frame instanceof frames.AMQPFrame || frame instanceof frames.SaslFrame) {
    return tu.convertFrameToBuffer(frame);
  } else if (Array.isArray(frame)) {
    return [frame[0], convertSequenceFramesToBuffers(frame[1])];
  }

  return frame;
}

MockServer.prototype.setSequence = function(reqs, resps) {
  this.requestsExpected = reqs.map(convertSequenceFramesToBuffers);
  this.responsesToSend = resps.map(convertSequenceFramesToBuffers);
};

MockServer.prototype._sendNext = function() {
  var toSend = this.responsesToSend[this.responseIdx++];
  this._sendUntil(toSend);
};

MockServer.prototype._sendUntil = function(toSend) {
  if (toSend instanceof Array) toSend = toSend[1];
  if (toSend && typeof toSend === 'string') {
    switch (toSend) {
      case 'disconnect':
        this.conn.end();
        break;
      case 'error':
        this.client._transport.emit('error', 'Forced error');
        break;
      default:
        this.conn.write(toSend, 'utf8', function() { debug('Wrote ' + toSend); });
    }
  } else if (toSend) {
    debug('Sending ' + toSend.toString('hex'));
    this.conn.write(toSend);
  } else {
    debug('No data to send.');
  }

  if (this.responseIdx < this.responsesToSend.length &&
      this.responsesToSend[this.responseIdx] instanceof Array &&
      this.responsesToSend[this.responseIdx][0]) {
    var nextToSend = this.responsesToSend[this.responseIdx++];
    this._sendUntil(nextToSend);
  }
};

MockServer.prototype._testData = function() {
  while (this.buffer.length) {
    expect(this.requestsExpected.length).to.be.greaterThan(0, 'More data received than expected');
    var expected = this.requestsExpected[this.requestIdx];
    if (this.buffer.length < expected.length) return;

    expected = this.requestsExpected[this.requestIdx++];
    var actual = this.buffer.slice(0, expected.length);
    this.buffer.consume(expected.length);

    debug('Receiving ' + actual.toString('hex'));
    expect(actual.toString('hex')).to.eql(expected.toString('hex'), 'Req ' + (this.requestIdx - 1));
    this._sendNext();
  }
};

MockServer.prototype.assertSequence = function(doneCB, timeout) {
  var timeoutInMillis = timeout || 1000;
  setTimeout(function() {
    doneCB();
  }, timeoutInMillis);
};

module.exports = MockServer;
