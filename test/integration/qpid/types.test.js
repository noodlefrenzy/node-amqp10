'use strict';
var AMQPClient = require('../../..').Client,
    Promise = require('bluebird'),
    config = require('./config'),
    expect = require('chai').expect;

var test = {};
describe('QPID', function() {

describe('Types', function() {
  beforeEach(function() {
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient();
  });

  afterEach(function() {
    return test.client.disconnect().then(function() {
      test.client = undefined;
    });
  });

  it('should be able to send objects', function(done) {
    var objectMessage = { test: 'object' };

    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(message) {
          expect(message.body).to.eql(objectMessage);
          done();
        });

        return sender.send(objectMessage);
      });
  });

  it('should be able to send timestamps', function(done) {
    var timestamp = { test: new Date() };

    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(message) {
          expect(message.body).to.eql(timestamp);
          done();
        });

        return sender.send(timestamp);
      });
  });

  it('should be able to send a big number', function(done) {
    var message = 2148532224;
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(msg) {
          expect(msg.body).to.eql(message);
          done();
        });

        return sender.send(message);
      });
  });

});
});
