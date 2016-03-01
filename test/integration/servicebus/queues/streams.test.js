'use strict';
var Promise = require('bluebird'),
    AMQPClient = require('../../../..').Client,
    Policy = require('../../../..').Policy,
    config = require('./config'),
    expect = require('chai').expect,
    uuid = require('uuid');

var test = {};
function setup() {
  if (!!test.client) delete test.client;
  test.client = new AMQPClient(Policy.ServiceBusQueue);
  return test.client.connect(config.address);
}

function teardown() {
  return test.client.disconnect()
    .then(function() { delete test.client; });
}

describe('ServiceBus', function() {

  describe('Streams', function() {
  describe('ReceiverStream', function() {
    beforeEach(setup);
    afterEach(teardown);

    it('should let you create a receiver link as a readable stream', function(done) {
      var dataString = uuid.v4().replace(/-/g, ''),
          expected = Array.apply(null, new Array(20))
            .map(function(a) { return Math.floor(Math.random() * 100); });

      return Promise.all([
        test.client.createReceiverStream(config.defaultLink),
        test.client.createSender(config.defaultLink)
      ])
      .spread(function(stream, sender) {
        var count = 0;
        stream.on('data', function(data) {
          if (data.body.DataString !== dataString) return;  // ignore previously run tests
          expect(expected[count]).to.eql(data.body.DataValue);
          count++;
          if (count === expected.length) done();
        });

        return Promise.mapSeries(expected, function(v) {
          return sender.send({ DataString: dataString, DataValue: v });
        });
      });
    });
  }); // ReceiverStream

  describe('SenderStream', function() {
    beforeEach(setup);
    afterEach(teardown);

    it('should let you create a sender link as a writable stream', function(done) {
      var dataString = uuid.v4().replace(/-/g, ''),
          expected = Array.apply(null, new Array(20))
            .map(function(a) { return Math.floor(Math.random() * 100); });

      return Promise.all([
        test.client.createReceiver(config.defaultLink),
        test.client.createSenderStream(config.defaultLink)
      ])
      .spread(function(receiver, stream) {
        var count = 0;
        receiver.on('message', function(data) {
          if (data.body.DataString !== dataString) return;  // ignore previously run tests
          expect(expected[count]).to.eql(data.body.DataValue);
          count++;
          if (count === expected.length) done();
        });

        for (var i = 0; i < expected.length; i++) {
          stream.write({ DataString: dataString, DataValue: expected[i] });
        }
      });
    });
  }); // SenderStream

  }); // Streams

}); // ServiceBus
