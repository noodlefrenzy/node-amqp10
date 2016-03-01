'use strict';
var Promise = require('bluebird'),
    AMQPClient = require('../../..').Client,
    config = require('./config'),
    expect = require('chai').expect;

var test = {};
describe('Streams', function() {

describe('ReadableStream', function() {
  beforeEach(function() {
    if (!!test.client) delete test.client;
    test.client = new AMQPClient();
    return test.client.connect(config.address);
  });

  afterEach(function() {
    return test.client.disconnect()
      .then(function() { delete test.client; });
  });

  it('should let you create a receiver link as a readable stream', function(done) {
    var expected = Array.apply(null, new Array(100))
      .map(function(a) { return Math.floor(Math.random() * 100); });

    return Promise.all([
      test.client.createReceiver(config.defaultLink, { stream: true }),
      test.client.createSender(config.defaultLink)
    ])
    .spread(function(stream, sender) {
      var count = 0;
      stream.on('data', function(data) {
        expect(expected[count]).to.eql(data.body);
        count++;
        if (count === expected.length) done();
      });

      var promises = [];
      for (var i = 0; i < expected.length; ++i)
        promises.push(sender.send(expected[i]));
      return Promise.all(promises);
    });
  });


}); // ReadableStream

});
