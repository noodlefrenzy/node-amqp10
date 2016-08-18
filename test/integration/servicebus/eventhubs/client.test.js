'use strict';
var AMQPClient = require('../../../../lib/index.js').Client,
  Policy = require('../../../../lib/index').Policy,
  translator = require('../../../../lib/index').translator,
  Promise = require('bluebird'),
  config = require('./config'),
  expect = require('chai').expect,
  uuid = require('uuid'),
  _ = require('lodash');

function createPartitionReceivers(client, count, prefix, options) {
  return Promise.map(_.range(count), function(partition) {
    return client.createReceiver(prefix + partition, options);
  });
}

var test = {};
describe('ServiceBus', function() {
describe('EventHubs', function () {
  beforeEach(function () {
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient(Policy.ServiceBusQueue);
  });

  afterEach(function () {
    return test.client.disconnect()
      .then(function() { test.client = undefined; });
  });

  it('should connect, send, and receive a message', function (done) {
    expect(config.senderLink, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var msgVal = uuid.v4();
    test.client.connect(config.address)
      .then(function() {
        return createPartitionReceivers(test.client, config.partitionCount, config.receiverLinkPrefix);
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
    expect(config.senderLink, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var msgVal = uuid.v4();
    var now = Date.now() - (1000 * 5); // 5 seconds ago

    var filterOptions = {
      attach: { source: { filter: {
        'apache.org:selector-filter:string': translator(
          ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', 'amqp.annotation.x-opt-enqueuedtimeutc > ' + now]])
      } } }
    };

    test.client.connect(config.address)
      .then(function() {
        return createPartitionReceivers(test.client, config.partitionCount, config.receiverLinkPrefix, filterOptions);
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
    expect(config.partitionSenderLinkPrefix, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var msgVal = uuid.v4();
    var partition = '1';
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.receiverLinkPrefix + partition),
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
    expect(config.partitionSenderLinkPrefix, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var msgVal1 = uuid.v4();
    var msgVal2 = uuid.v4();
    var partition = '1';
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.receiverLinkPrefix + partition),
          test.client.createSender(config.partitionSenderLinkPrefix + partition)
        ]);
      })
      .spread(function (receiver, sender) {
        receiver.on('message', function (message) {
          expect(message).to.exist;
          expect(message.body).to.exist;
          // Ignore messages that aren't from us.
          if (!!message.body.DataValue && message.body.DataValue === msgVal1) {
            var offset = message.messageAnnotations['x-opt-offset'];
            var timestamp = message.messageAnnotations['x-opt-enqueued-time'].getTime();
            receiver.detach().then(function() {
              var filterOptions = {
                attach: { source: { filter: {
                  'apache.org:selector-filter:string': translator(
                    ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', "amqp.annotation.x-opt-offset > '" + offset + "'"]])
                } } }
              };
              test.client.createReceiver(config.receiverLinkPrefix + partition, filterOptions).then(function (receiver2) {
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
