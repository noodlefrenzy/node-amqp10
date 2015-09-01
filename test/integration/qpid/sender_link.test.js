'use strict';
var AMQPClient = require('../../..').Client,
    c = require('../../../').Constants,
    Promise = require('bluebird'),
    config = require('./config'),
    expect = require('chai').expect;

var test = {};
describe('QPID', function() {

describe('SenderLink', function() {
  beforeEach(function() {
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient();
  });

  afterEach(function() {
    return test.client.disconnect().then(function() {
      test.client = undefined;
    });
  });

  it('should allow the definition of a default subject', function(done) {
    return test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver('amq.topic/not-news'),
          test.client.createReceiver('amq.topic/news'),
          test.client.createSender('amq.topic/news')
        ]);
      })
      .spread(function(receiverWithoutSubject, receiverWithSubject, sender) {
        receiverWithoutSubject.on('message', function(message) {
          expect(message).to.not.exist;
        });

        receiverWithSubject.on('message', function(message) {
          done();
        });

        return sender.send('test message');
      });
  });

  it('should accept messages as the first parameter', function(done) {
    return test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver('test.disposition.queue'),
          test.client.createSender('test.disposition.queue')
        ]);
      })
      .spread(function(receiver, sender) {
        var receivedCount = 0;
        receiver.on('message', function(message) {
          expect(message.body).to.eql({ a: 'message' });
          expect(message.properties.replyTo).to.eql('somewhere');
          receivedCount++;
          if (receivedCount === 2) return done();
          return sender.send(message);
        });

        return sender.send({
          properties: { replyTo: 'somewhere' },
          body: { a: 'message' }
        });
      });
  });

});
});
