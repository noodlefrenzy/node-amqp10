'use strict';
var Promise = require('bluebird'),
    AMQPClient = require('../../..').Client,
    config = require('./config'),
    expect = require('chai').expect;

var test = {};
function setup() {
  if (!!test.client) delete test.client;
  test.client = new AMQPClient();
  return test.client.connect(config.address);
}

function teardown() {
  return test.client.disconnect()
    .then(function() { delete test.client; });
}

describe('QPID', function() {

  describe('Streams', function() {
  describe('ReceiverStream', function() {
    beforeEach(setup);
    afterEach(teardown);

    it('should let you create a receiver link as a readable stream', function(done) {
      var expected = Array.apply(null, new Array(100))
        .map(function(a) { return Math.floor(Math.random() * 100); });

      Promise.all([
        test.client.createReceiverStream(config.defaultLink),
        test.client.createSender(config.defaultLink, { callback: 'none' })
      ])
      .spread(function(stream, sender) {
        var count = 0;
        stream.on('data', function(data) {
          expect(expected[count]).to.eql(data.body);
          count++;

          if (count === expected.length) done();
        });

        return Promise.mapSeries(expected, function(v) { return sender.send(v); });
      });
    });

    it('should set the highWaterMark to creditQuantum', function() {
      return test.client.createReceiverStream(config.defaultLink, { creditQuantum: 42 })
        .then(function(stream) {
          expect(stream._readableState.highWaterMark).to.equal(42);
        });
    });
  }); // ReceiverStream

  describe('SenderStream', function() {
    beforeEach(setup);
    afterEach(teardown);

    it('should let you create a sender link as a writable stream', function(done) {
      var expected = Array.apply(null, new Array(100))
        .map(function(a) { return Math.floor(Math.random() * 100); });

      Promise.all([
        test.client.createReceiver(config.defaultLink),
        test.client.createSenderStream(config.defaultLink, { callback: 'none' })
      ])
      .spread(function(receiver, stream) {
        var count = 0;
        receiver.on('message', function(data) {
          expect(expected[count]).to.eql(data.body);
          count++;
          if (count === expected.length) done();
        });

        for (var i = 0; i < expected.length; ++i) {
          stream.write(expected[i]);
        }
      });
    });

    it('should honor the sender link callback policy', function(done) {
      var expected = Array.apply(null, new Array(100))
        .map(function(a) { return Math.floor(Math.random() * 100); });

      Promise.all([
        test.client.createReceiver(config.defaultLink),
        test.client.createSenderStream(config.defaultLink, { callback: 'sent' })
      ])
      .spread(function(receiver, stream) {
        var count = 0;
        receiver.on('message', function(data) {
          expect(expected[count]).to.eql(data.body);
          count++;
          if (count === expected.length) done();
        });

        for (var i = 0; i < expected.length; ++i) {
          stream.write(expected[i]);
        }
      });
    });

  }); // SenderStream

  describe('Both', function() {
    beforeEach(setup);
    afterEach(teardown);
    it('should allow you to stream from sender to receiver', function(done) {
      var expected = Array.apply(null, new Array(100))
        .map(function(a) { return Math.floor(Math.random() * 100); });

      Promise.all([
        test.client.createReceiver(config.defaultLink),
        test.client.createReceiverStream('test.streams.queue'),
        test.client.createSenderStream(config.defaultLink, { callback: 'none' }),
      ])
      .spread(function(receiver, receiverStream, senderStream) {
        var count = 0;
        receiver.on('message', function(message) {
          expect(expected[count]).to.eql(message.body);
          count++;
          if (count === expected.length) done();
        });

        receiverStream.pipe(senderStream);
        return test.client.createSender('test.streams.queue', { callback: 'none' });
      })
      .then(function(sender) {
        return Promise.mapSeries(expected, function(v) { return sender.send(v); });
      });
    });
  }); // Both

  }); // Streams

}); // QPID