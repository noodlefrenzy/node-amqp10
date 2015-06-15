'use strict';
var AMQPClient = require('../../..').Client,
    config = require('./config'),
    expect = require('chai').expect;

var test = {};
describe('QPID', function() {

describe('Client', function() {
  before(function() {
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient();
  });

  it('should connect, send, and receive a message', function(done) {
    var linkName = 'amq.topic';
    test.client.connect(config.address)
      .then(function() {
        return test.client.createReceiver(linkName, null, function(err, message) {
          expect(err).to.not.exist;
          expect(message).to.exist;
          done();
        });
      })
      .then(function() {
        return test.client.send('test', linkName);
      })
      .catch(function(err) {
        expect(err).to.not.exist;
      });
  });
});

});
