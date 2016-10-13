'use strict';
var AMQPClient = require('../../..').Client,
    Policy = require('../../..').Policy,
    Promise = require('bluebird'),
    config = require('./config'),
    expect = require('chai').expect;

var test = {};
describe('QPID', function() {
describe('ReceiverLink', function() {
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
          test.client.createSender('amq.topic')
        ]);
      })
      .spread(function(receiverWithoutSubject, receiverWithSubject, sender) {
        receiverWithoutSubject.on('message', function(message) {
          expect(message).to.not.exist;
        });

        receiverWithSubject.on('message', function(message) {
          done();
        });

        return sender.send('test message', { properties: { subject: 'news' } });
      });
  });

  it('should refresh link after settling with `release` outcome', function(done) {
    var throttledClient =
      new AMQPClient(Policy.Utils.RenewOnSettle(1, 1, Policy.Default));

    Promise.all([
      test.client.connect(config.address),
      throttledClient.connect(config.address)
    ])
    .then(function() {
      return Promise.all([
        test.client.createSender('amq.topic'),
        throttledClient.createReceiver('amq.topic')
      ]);
    })
    .spread(function(sender, receiver) {
      var messages = ['test1', 'test2', 'test3'];
      var received = 0;
      receiver.on('message', function(msg) {
        expect(msg.body).to.eql(messages[received]);
        received++;
        this.release(msg);
        if (received === messages.length) {
          throttledClient.disconnect().then(done);
        }
      });

      return Promise.all([
        sender.send(messages[0]),
        sender.send(messages[1]),
        sender.send(messages[2])
      ]);
    });
  });

  it('should emit the transfer frame, as well as message', function(done) {
    var deliveryTag = new Buffer([0x00, 0x00, 0x00, 0x00]);
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver('amq.topic'),
          test.client.createSender('amq.topic')
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(msg, frame) {
          expect(msg).to.exist;
          expect(msg.body).to.eql('test message');
          expect(frame).to.exist;
          expect(frame.deliveryTag).to.eql(deliveryTag);
          done();
        });

        return sender.send('test message');
      });
  });

}); // ReceiverLink
}); // QPID
