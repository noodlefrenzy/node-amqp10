'use strict';
var AMQPClient = require('../../..').Client,
    c = require('../../../').Constants,
    Promise = require('bluebird'),
    config = require('./config'),
    expect = require('chai').expect,
    BrokerAgent = require('qmf2');

var test = {};
describe('QPID', function() {

describe('Disposition', function() {
  beforeEach(function() {
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient();
  });

  afterEach(function() {
    return test.client.disconnect().then(function() {
      test.client = undefined;
      test.broker = undefined;
    });
  });

  it('should auto-settle messages received from queue', function(done) {
    var queueName = 'test.disposition.queue';
    var messageCount = 0;
    return test.client.connect(config.address)
      .then(function() {
        test.broker = new BrokerAgent(test.client);

        return Promise.all([
          test.broker.initialize(),
          test.client.createReceiver(queueName),
          test.client.createSender(queueName)
        ]);
      })
      .spread(function(brokerAgent, receiver, sender) {
        receiver.on('message', function(message) {
          messageCount++;
          if (messageCount !== 2)
            return;

          test.broker.getQueue(queueName)
            .then(function(queue) {
              expect(queue.msgDepth.toNumber(true)).to.equal(0);
              done();
            });
        });

        return Promise.all([
          sender.send('first message'),
          sender.send('second message')
        ]);
      });
  });

  it('should allow for manual disposition of received messages', function(done) {
    var queueName = 'test.disposition.queue';
    var messageCount = 0;

    return test.client.connect(config.address)
      .then(function() {
        test.broker = new BrokerAgent(test.client);
        return Promise.all([
          test.broker.initialize(),
          test.client.createReceiver(queueName, {
            policy: {
              receiverSettleMode: c.receiverSettleMode.settleOnDisposition,
              credit: function(link) {}
            }
          }),
          test.client.createSender(queueName)
        ]);
      })
      .spread(function(brokerAgent, receiver, sender) {
        receiver.addCredits(1);
        receiver.on('message', function(message) {
          messageCount++;

          // send manual disposition
          receiver.accept(message);

          if (messageCount !== 2) {
            // increment credits to receive next message
            receiver.addCredits(1);
            return;
          }

          test.broker.getQueue(queueName)
            .then(function(queue) {
              expect(queue.msgDepth.toNumber(true)).to.equal(0);
              done();
            });
        });

        return Promise.all([
          sender.send('first message'),
          sender.send('second message')
        ]);
      });
  });

});
});
