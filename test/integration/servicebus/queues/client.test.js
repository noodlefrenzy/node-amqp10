'use strict';
var AMQPClient = require('../../../../lib/index.js').Client,
  Policy = require('../../../../lib/index').Policy,
  Message = require('../../../../lib/types/message'),
  Promise = require('bluebird'),
  config = require('./config'),
  expect = require('chai').expect,
  uuid = require('uuid'),
  debug = require('debug')('amqp10:test:servicebus:queues'),

  M = require('../../../../lib/types/message');

var test = {};
describe('ServiceBus', function() {
  describe('Queues', function() {

    beforeEach(function() {
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(Policy.ServiceBusQueue);
    });

    afterEach(function() {
      return test.client.disconnect().then(function() {
        test.client = undefined;
      });
    });

    it('should connect, send, and receive a message', function(done) {
      var msgVal = uuid.v4();
      expect(config.serviceBusHost, 'Required environment variables').to.exist;
      test.client.connect(config.address)
        .then(function() {
          return Promise.all([
            test.client.createReceiver(config.defaultLink),
            test.client.createSender(config.defaultLink)
          ]);
        })
        .spread(function(receiver, sender) {
          receiver.on('message', function(message) {
            expect(message).to.exist;
            expect(message.body).to.exist;
            // Ignore messages that aren't from us.
            if (!!message.body.DataValue && message.body.DataValue === msgVal) {
              done();
            }
          });

          return sender.send({"DataString": "From Node v2", "DataValue": msgVal});
        });
    });

    it('should return the same link when one sender link is attaching', function() {
      return test.client.connect(config.address)
        .then(function() {
          return Promise.all([
            test.client.createSender(config.defaultLink),
            test.client.createSender(config.defaultLink)
          ]);
        })
        .spread(function(first, second) {
          expect(first).to.eql(second);
        });
    });
  });
});
