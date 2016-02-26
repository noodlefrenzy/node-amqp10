'use strict';
var AMQPClient = require('../../../../lib/index.js').Client,
  Policy = require('../../../../lib/index').Policy,
  Promise = require('bluebird'),
  config = require('./config'),
  expect = require('chai').expect,
  uuid = require('uuid');

var test = {};
describe('ServiceBus', function() {
describe('Queues', function() {
  beforeEach(function() {
    if (!!test.client) test.client = undefined;
  });

  afterEach(function() {
    return test.client.disconnect()
      .then(function() { test.client = undefined; });
  });

  it('should connect, send, and receive a message', function(done) {
    expect(config.serviceBusHost, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var msgVal = uuid.v4();
    test.client = new AMQPClient(Policy.ServiceBusQueue);
    return test.client.connect(config.address)
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
    expect(config.serviceBusHost, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    test.client = new AMQPClient(Policy.Utils.RenewOnSettle(1, 1, Policy.ServiceBusQueue));
    var count = 0;
    var acked = false;
    return test.client.connect(config.address)
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
          sender.send({ DataString: 'From Node v2', DataValue: uuid.v4() }),
          sender.send({ DataString: 'From Node v2', DataValue: uuid.v4() })
        ]);
      });

  });

  it('should allow you to reject messages', function(done) {
    expect(config.serviceBusHost, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var msgVal = uuid.v4();
    var rejected = false;
    test.client = new AMQPClient(Policy.merge({ receiverLink: { attach: { receiverSettleMode: 1 }}}, Policy.ServiceBusQueue));
    return test.client.connect(config.address)
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
            if (rejected) {
              done();
            } else {
              receiver.reject(message, 'Testing rejection');
            }
          }
        });

        return sender.send({ DataString: 'From Node v2', DataValue: msgVal });
      });

  });
}); // Queues
}); // ServiceBus
