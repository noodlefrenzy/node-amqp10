'use strict';
var Promise = require('bluebird'),
    AMQPClient = require('../../../..').Client,
    Policy = require('../../../..').Policy,
    config = require('./config'),
    expect = require('chai').expect;

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

describe('Streams', function() {
describe('ReceiverStream', function() {
  beforeEach(setup);
  afterEach(teardown);

  it('should let you create a receiver link as a readable stream', function(done) {
    var expected = Array.apply(null, new Array(100))
      .map(function(a) { return Math.floor(Math.random() * 100); });

    return Promise.all([
      test.client.createReceiverStream(config.defaultLink),
      test.client.createSender(config.defaultLink)
    ])
    .spread(function(stream, sender) {
      var count = 0;
      stream.on('data', function(data) {
        expect(expected[count]).to.eql(data.body);
        count++;
        if (count === expected.length) done();
      });

      var promises = [];
      for (var i = 0; i < expected.length; ++i)
        promises.push(sender.send(expected[i]));
      return Promise.all(promises);
    });
  });
}); // ReceiverStream

describe('SenderStream', function() {
  beforeEach(setup);
  afterEach(teardown);

  it('should let you create a receiver link as a readable stream', function(done) {
    var expected = Array.apply(null, new Array(100))
      .map(function(a) { return Math.floor(Math.random() * 100); });

    return Promise.all([
      test.client.createReceiver(config.defaultLink),
      test.client.createSenderStream(config.defaultLink)
    ])
    .spread(function(receiver, stream) {
      var count = 0;
      receiver.on('message', function(data) {
        expect(expected[count]).to.eql(data.body);
        count++;
        if (count === expected.length) done();
      });

      for (var i = 0; i < expected.length; i++) {
        stream.write(expected[i]);
      }
    });
  });
}); // SenderStream

}); // Streams
