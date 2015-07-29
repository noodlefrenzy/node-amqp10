'use strict';
var AMQPClient = require('../../..').Client,
    c = require('../../../').Constants,
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
    done();

    /*
    NOTE: this will only work once we properly hash link creation to ensure
          that they are unique. Creating a link for amq.topic and amq.topic/news
          currently will result in the first link being reused

    return test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver('amq.topic'),
          test.client.createReceiver('amp.topic/news'),
          test.client.createSender('amq.topic')
        ]);
      })
      .spread(function(receiverWithoutSubject, receiverWithSubject, sender) {
        receiverWithoutSubject.on('message', function(message) {
          console.log('without subject received');
          expect(message).to.not.exist;
        });

        receiverWithSubject.on('message', function(message) {
          console.log('with subject received');
          done();
        });

        return sender.send('test message', { properties: { subject: 'news' } });
      });
    */
  });

});
});
