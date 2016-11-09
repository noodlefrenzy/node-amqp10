'use strict';
var AMQPClient = require('../../..').Client,
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
    test.client.connect(config.address)
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

  it('should allow per-sender override of encoder', function(done) {
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver('amq.topic'),
          test.client.createSender('amq.topic', { encoder: function(body) { return 'llama'; } }),
          test.client.createSender('amq.topic'),
        ]);
      })
      .spread(function(receiver, senderWithEncoder, sender) {
        var received = [];
        receiver.on('message', function(message) {
          received.push(message.body);
          if (received.length === 2) {
            expect(received).to.include.members([ 'test', 'llama' ]);
            done();
          }
        });

        return Promise.all([ senderWithEncoder.send('test'), sender.send('test') ]);
      });
  });


  it('should merge default subject if sent message is raw', function(done) {
    test.client.connect(config.address)
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

        return sender.send({ body: 'test message' });
      });
  });

  it('should accept messages as the first parameter', function(done) {
    test.client.connect(config.address)
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

  function CustomType(eventType) {
    this.event = eventType;
  }

  it('should send custom types', function(done) {
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(message) {
          expect(message.body).to.eql({ event: 'finished' });
          done();
        });

        return sender.send(new CustomType('finished'));
      });
  });

  it('should send and receive multi-frame messages', function(done) {
    var messageData = new Array(2048).join('0');
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(message) {
          expect(message.body).to.eql(messageData);
          done();
        });

        return sender.send(messageData);
      });
  });

  it('should resolve pending messages on disconnect', function(done) {
    test.client.connect(config.address)
      .then(function() { return test.client.createSender('amq.topic'); })
      .then(function(sender) {
        sender.linkCredit = 0;
        sender.send({ test: 'data' }).catch(function(err) { done(); });
        return test.client.disconnect();
      });
  });

});
});
