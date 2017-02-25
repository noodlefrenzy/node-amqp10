'use strict';
var amqp = require('../../../../lib'),
    AMQPClient = amqp.Client,
    Policy = amqp.Policy,
    t = amqp.Type,
    Promise = require('bluebird'),
    config = require('./config'),
    expect = require('chai').expect,
    u = require('../../../../lib/utilities'),
    _ = require('lodash');

function createPartitionReceivers(client, count, prefix, options) {
  return Promise.map(_.range(count), function(partition) {
    return client.createReceiver(prefix + partition, options);
  });
}

// This is necessary because EH seems to not be purging messages correctly,
// so we're date-bounding receivers. Ideally, we should NOT be doing filter options
// in this test, since that's explicitly tested below.
function boundedFilter(offset) {
  offset = offset || 5; // default to 5s ago
  var enqueuedTimeUTC = Date.now() - (offset * 1000);

  return {
    attach: { source: { filter: {
      'apache.org:selector-filter:string': t.described(
        t.symbol('apache.org:selector-filter:string'),
        t.string('amqp.annotation.x-opt-enqueuedtimeutc > ' + enqueuedTimeUTC)
      )
    } } }
  };
}

var test = {};
describe('ServiceBus', function() {
describe('EventHubs', function () {
  beforeEach(function () {
    if (config instanceof Error) return this.skip(config);
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient(Policy.ServiceBusQueue);
  });

  afterEach(function () {
    return test.client.disconnect()
      .then(function() { test.client = undefined; });
  });

  it('should connect, send, and receive a message', function (done) {
    var msgVal = u.uuidV4();
    test.client.connect(config.address)
      .then(function() {
        return createPartitionReceivers(test.client, config.partitionCount, config.receiverLinkPrefix, boundedFilter());
      })
      .map(function(receiver) {
        receiver.on('message', function (message) {
          expect(message).to.exist;
          expect(message.body).to.exist;
          // Ignore messages that aren't from us.
          if (!!message.body.DataValue && message.body.DataValue === msgVal) {
            done();
          }
        });
      })
      .then(function() { return test.client.createSender(config.senderLink); })
      .then(function(sender) { return sender.send({ DataString: 'From Node v2', DataValue: msgVal }); });
  });

  it('should create receiver with date-based x-header', function (done) {
    var msgVal = u.uuidV4();
    test.client.connect(config.address)
      .then(function() {
        return createPartitionReceivers(test.client, config.partitionCount, config.receiverLinkPrefix, boundedFilter());
      })
      .map(function(receiver) {
        receiver.on('message', function(message) {
          expect(message).to.exist;
          expect(message.body).to.exist;
          // Ignore messages that aren't from us.
          if (!!message.body.DataValue && message.body.DataValue === msgVal) {
            done();
          }
        });
      })
      .then(function() { return test.client.createSender(config.senderLink); })
      .then(function(sender) { return sender.send({ DataString: 'From Node v2', DataValue: msgVal }); });
  });

  it('should send to a specific partition', function (done) {
    var msgVal = u.uuidV4();
    var partition = '1';

    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.receiverLinkPrefix + partition, boundedFilter()),
          test.client.createSender(config.partitionSenderLinkPrefix + partition)
        ]);
      })
      .spread(function (receiver, sender) {
        receiver.on('message', function (message) {
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

  it('should only receive messages after last offset when using offset-based x-header', function (done) {
    var msgVal1 = u.uuidV4();
    var msgVal2 = u.uuidV4();
    var partition = '1';

    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.receiverLinkPrefix + partition, boundedFilter()),
          test.client.createSender(config.partitionSenderLinkPrefix + partition)
        ]);
      })
      .spread(function (receiver, sender) {
        receiver.on('message', function (message) {
          expect(message).to.exist;
          expect(message.body).to.exist;
          // Ignore messages that aren't from us.
          if (!!message.body.DataValue && message.body.DataValue === msgVal1) {
            var timestamp = message.messageAnnotations['x-opt-enqueued-time'].getTime();
            receiver.detach().delay(2000).then(function() {
              test.client.createReceiver(config.receiverLinkPrefix + partition, boundedFilter(1))
                .then(function (receiver2) {
                  receiver2.on('message', function(msg) {
                    expect(msg).to.exist;
                    expect(msg.body).to.exist;
                    // Ignore messages that aren't from this test run.
                    if (!!msg.body.DataValue && (msg.body.DataValue === msgVal1 || msg.body.DataValue === msgVal2)) {
                      expect(msg.messageAnnotations['x-opt-enqueued-time'].getTime()).to.be.above(timestamp);
                      expect(msg.body.DataValue).to.not.eql(msgVal1);
                      expect(msg.body.DataValue).to.eql(msgVal2);
                      done();
                    }
                  });
                  return sender.send({ DataString: 'From Node v2', DataValue: msgVal2 });
                });
            });
          }
        });

        return sender.send({ DataString: 'From Node v2', DataValue: msgVal1 });
      });
  });

}); // EventHubs
}); // ServiceBus
