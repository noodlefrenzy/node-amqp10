'use strict';
var Promise = require('bluebird'),
    amqp = require('../../../..'),
    AMQPClient = amqp.Client,
    t = amqp.Type,
    Policy = amqp.Policy,
    config = require('./config'),
    expect = require('chai').expect,
    u = require('../../../../lib/utilities');

var test = {};
if (process.version.match(/v0.10/))
  test.partition = 1;
else if (process.version.match(/v0.12/))
  test.partition = 2;
else if (process.version.match(/v4/))
  test.partition = 3;
else
  test.partition = Math.floor(Math.random() * config.partitionCount);

function setup() {
  if (config instanceof Error) return this.skip(config);  // jshint ignore:line
  if (!!test.client) delete test.client;
  test.client = new AMQPClient(Policy.ServiceBusQueue);
  return test.client.connect(config.address);
}

function teardown() {
  return test.client.disconnect()
    .then(function() { delete test.client; });
}

describe('ServiceBus', function() {

describe('Streams', function() {
describe('ReceiverStream', function() {
  beforeEach(setup);
  afterEach(teardown);

  it('should let you create a receiver link as a readable stream', function(done) {
    var now = Date.now() - (1000 * 5); // 5 seconds ago

    // This is necessary because EH seems to not be purging messages correctly, so we're date-bounding receivers. Ideally, we should NOT
    //  be doing filter options in this test, since that's explicitly tested below.
    var filterOptions = {
      attach: { source: { filter: {
        'apache.org:selector-filter:string': t.described(
          t.symbol('apache.org:selector-filter:string'),
          t.string('amqp.annotation.x-opt-enqueuedtimeutc > ' + now)
        )
      } } }
    };

    expect(config.partitionSenderLinkPrefix,
      'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var dataString = u.uuidV4().replace(/-/g, ''),
        expected = Array.apply(null, new Array(20))
          .map(function(a) { return Math.floor(Math.random() * 100); });

    Promise.all([
      test.client.createReceiverStream(config.receiverLinkPrefix + test.partition, filterOptions),
      test.client.createSender(config.partitionSenderLinkPrefix + test.partition, { callback: 'none' })
    ])
    .spread(function(stream, sender) {
      var count = 0;
      stream.on('data', function(data) {
        if (data.body.DataString !== dataString) return;  // ignore previously run tests
        expect(expected[count]).to.eql(data.body.DataValue);
        count++;
        if (count === expected.length) done();
      });

      return Promise.mapSeries(expected, function(v) {
        return sender.send({ DataString: dataString, DataValue: v });
      });
    });
  });
}); // ReceiverStream

describe('SenderStream', function() {
  beforeEach(setup);
  afterEach(teardown);

  it('should let you create a sender link as a writable stream', function(done) {
    var dataString = u.uuidV4().replace(/-/g, ''),
        expected = Array.apply(null, new Array(20))
          .map(function(a) { return Math.floor(Math.random() * 100); });

    var now = Date.now() - (1000 * 5); // 5 seconds ago

    // This is necessary because EH seems to not be purging messages correctly, so we're date-bounding receivers. Ideally, we should NOT
    //  be doing filter options in this test, since that's explicitly tested below.
    var filterOptions = {
      attach: { source: { filter: {
        'apache.org:selector-filter:string': t.described(
          t.symbol('apache.org:selector-filter:string'),
          t.string('amqp.annotation.x-opt-enqueuedtimeutc > ' + now)
        )
      } } }
    };

    Promise.all([
      test.client.createReceiver(config.receiverLinkPrefix + test.partition, filterOptions),
      test.client.createSenderStream(config.partitionSenderLinkPrefix + test.partition, { callback: 'none' })
    ])
    .spread(function(receiver, stream) {
      var count = 0;
      receiver.on('message', function(data) {
        if (data.body.DataString !== dataString) return;  // ignore previously run tests
        expect(expected[count]).to.eql(data.body.DataValue);
        count++;
        if (count === expected.length) done();
      });

      for (var i = 0; i < expected.length; i++) {
        stream.write({ DataString: dataString, DataValue: expected[i] });
      }
    });
  });
}); // SenderStream

}); // Streams

}); // ServiceBus
