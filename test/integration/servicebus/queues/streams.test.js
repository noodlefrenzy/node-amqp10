'use strict';
var Promise = require('bluebird'),
    AMQPClient = require('../../../..').Client,
    Policy = require('../../../..').Policy,
    config = require('./config'),
    async = require('async'),
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

      this.timeout(10000);

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

        async.timesSeries(expected.length, function(n, next){
          sender.send(expected[n])
            .then(function() {
              next();
            })
            .error(function(err) {
              next(err);
            })
          ;
        });

      });
    });
  }); // ReadableStream

  describe('SenderStream', function() {

    beforeEach(setup);
    afterEach(teardown);

    it('should let you create a receiver link as a readable stream', function(done) {

      this.timeout(10000);

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
  }); // WritableStream

});
