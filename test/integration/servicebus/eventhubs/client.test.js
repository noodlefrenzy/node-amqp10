'use strict';
var AMQPClient = require('../../../../lib/index.js').Client,
  Policy = require('../../../../lib/index').Policy,
  Message = require('../../../../lib/types/message'),
  Promise = require('bluebird'),
  config = require('./config'),
  expect = require('chai').expect,
  uuid = require('uuid'),
  debug = require('debug')('amqp10:test:servicebus:queues'),
  _ = require('lodash'),

  M = require('../../../../lib/types/message');

var test = {};
describe('ServiceBus', function() {
  describe('EventHubs', function () {

    beforeEach(function () {
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(Policy.ServiceBusQueue);
    });

    afterEach(function () {
      return test.client.disconnect().then(function () {
        test.client = undefined;
      });
    });

    it('should connect, send, and receive a message', function (done) {
      expect(config.senderLink, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;
      var msgVal = uuid.v4();
      test.client.connect(config.address)
        .then(function() {
          return Promise.all(
            _.range(config.partitionCount).map(function(partition) { return test.client.createReceiver(config.receiverLinkPrefix + partition); }).
              concat(test.client.createSender(config.senderLink))
          );
        })
        .then(function (links) {
          var sender = links.pop();
          _.each(links, function (receiver) {
            receiver.on('message', function (message) {
              expect(message).to.exist;
              expect(message.body).to.exist;
              // Ignore messages that aren't from us.
              if (!!message.body.DataValue && message.body.DataValue === msgVal) {
                done();
              }
            });
          });

          return sender.send({"DataString": "From Node v2", "DataValue": msgVal});
        });
    });

    it('should create receiver with date-based x-header', function (done) {
      expect(config.senderLink, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;
      var msgVal = uuid.v4();
      var now = Date.now() - (1000 * 5); // 5 seconds ago
      var filterOptions = {
        filter: {
          'apache.org:selector-filter:string': AMQPClient.adapters.Translator(
            ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', "amqp.annotation.x-opt-enqueuedtimeutc > " + now]])
        }
      };
      test.client.connect(config.address)
        .then(function() {
          return Promise.all(
            _.range(config.partitionCount).map(function(partition) { return test.client.createReceiver(config.receiverLinkPrefix + partition, filterOptions); }).
              concat(test.client.createSender(config.senderLink))
          );
        })
        .then(function (links) {
          var sender = links.pop();
          _.each(links, function (receiver) {
            receiver.on('message', function (message) {
              expect(message).to.exist;
              expect(message.body).to.exist;
              // Ignore messages that aren't from us.
              if (!!message.body.DataValue && message.body.DataValue === msgVal) {
                done();
              }
            });
          });

          return sender.send({"DataString": "From Node v2", "DataValue": msgVal});
        });
    });
  });
});
