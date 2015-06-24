'use strict';
var AMQPClient = require('../../..').Client,
    Message = require('../../../lib/types/message'),
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
        return Promise.all([
          test.client.send('first message', queueName),
          test.client.send('second message', queueName)
        ]);
      });
  });

});
});
