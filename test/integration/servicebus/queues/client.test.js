'use strict';
var amqp = require('../../../..'),
    AMQPClient = amqp.Client,
    Policy = amqp.Policy,
    Promise = require('bluebird'),
    config = require('./config'),
    expect = require('chai').expect,
    u = require('../../../../lib/utilities');

var test = {};
describe('ServiceBus', function() {
describe('Queues', function() {
  beforeEach(function() {
    if (config instanceof Error) return this.skip(config);
    if (!!test.client) test.client = undefined;
    expect(config.address).to.exist;
  });

  afterEach(function() {
    return test.client.disconnect()
      .then(function() { test.client = undefined; });
  });

  it('should connect, send, and receive a message', function(done) {
    var msgVal = u.uuidV4();
    test.client = new AMQPClient(Policy.ServiceBusQueue);
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

        return sender.send({ DataString: 'From Node v2', DataValue: msgVal });
      });
  });

  it('should throttle based on link credit policy', function(done) {
    test.client = new AMQPClient(Policy.ServiceBusQueue, Policy.Utils.RenewOnSettle(1, 1));

    var count = 0;
    var acked = false;
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
          ++count;
          if (count > 1) {
            expect(acked).to.be.true;
            done();
          } else {
            setTimeout(function () {
              // Wait a second, and then "ack" the message.
              acked = true;
              receiver.accept(message);
            }, 1000);
          }
        });

        return Promise.all([
          sender.send({ DataString: 'From Node v2', DataValue: u.uuidV4() }),
          sender.send({ DataString: 'From Node v2', DataValue: u.uuidV4() })
        ]);
      });

  });

  it('should allow you to reject messages and continue to receive subsequent', function(done) {
    var msgVal1 = u.uuidV4();
    var msgVal2 = u.uuidV4();
    test.client = new AMQPClient(Policy.ServiceBusQueue, {
      receiverLink: { attach: { receiverSettleMode: 1 } }
    });

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
          if (!!message.body.DataValue && (message.body.DataValue === msgVal1 || message.body.DataValue === msgVal2)) {
            if (message.body.DataValue === msgVal1) {
              receiver.reject(message, 'internal-error');
              sender.send({ DataString: 'From Node v2', DataValue: msgVal2 });
            } else if (message.body.DataValue === msgVal2) {
              receiver.accept(message);
              done();
            }
          } else {
            receiver.accept(message);
          }
        });

        return sender.send({ DataString: 'From Node v2', DataValue: msgVal1 });
      });

  });
}); // Queues
}); // ServiceBus
