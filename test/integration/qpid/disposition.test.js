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
      test.receiverLink = undefined;
    });
  });

  it('should auto-settle messages received from queue', function(done) {
    var queueName = 'test.disposition.queue';
    var messageCount = 0;
    return test.client.connect(config.address)
      .then(function() {
        test.broker = new BrokerAgent(test.client);
        return test.client.createReceiver(queueName, null, function(err, message) {
          expect(err).to.not.exist;
          messageCount++;
          if (messageCount !== 2)
            return;

          test.broker.getQueue(queueName)
            .then(function(queue) {
              expect(queue.msgDepth.toNumber(true)).to.equal(0);
              done();
            });
        });
      })
      .then(function() {
        return test.client.createSender(queueName);
      })
      .then(function(senderLink) {
        return Promise.all([
          senderLink.send('first message', queueName),
          senderLink.send('second message', queueName)
        ]);
      });
  });

  it('should allow for manual disposition of received messages', function(done) {
    var queueName = 'test.disposition.queue';
    var messageCount = 0;

    test.client.policy.receiverLink.options.receiverSettleMode =
      c.receiverSettleMode.settleOnDisposition;
    test.client.policy.receiverLink.credit = function(link) {
      if (link.name === 'qmf.default.topic_RX') link.addCredits(1);
    };

    return test.client.connect(config.address)
      .then(function() {
        test.broker = new BrokerAgent(test.client);
        return test.client.createReceiver(queueName, null, function(err, message) {
          expect(err).to.not.exist;
          messageCount++;

          // send manual disposition
          test.receiverLink.accept(message);

          if (messageCount !== 2) {
            // increment credits to receive next message
            test.receiverLink.addCredits(1);
            return;
          }

          test.broker.getQueue(queueName)
            .then(function(queue) {
              expect(queue.msgDepth.toNumber(true)).to.equal(0);
              done();
            });
        });
      })
      .then(function(receiverLink) {
        test.receiverLink = receiverLink;
        test.receiverLink.addCredits(1);
        return test.client.createSender(queueName);
      })
      .then(function(senderLink) {
        return Promise.all([
          senderLink.send('first message', queueName),
          senderLink.send('second message', queueName)
        ]);
      });
  });

});
});
