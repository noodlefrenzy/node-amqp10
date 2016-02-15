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
    test.client = new AMQPClient(Policy.ServiceBusQueue);
  });

  afterEach(function() {
    return test.client.disconnect()
      .then(function() { test.client = undefined; });
  });

  it('should connect, send, and receive a message', function(done) {
    expect(config.serviceBusHost, 'Required env vars not found in ' + Object.keys(process.env)).to.exist;

    var msgVal = uuid.v4();
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
}); // Queues
}); // ServiceBus
