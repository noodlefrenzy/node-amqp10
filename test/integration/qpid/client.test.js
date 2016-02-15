'use strict';
var Promise = require('bluebird'),
    AMQPClient = require('../../..').Client,
    config = require('./config'),
    expect = require('chai').expect;

var test = {};
describe('QPID', function() {

describe('Client', function() {
  beforeEach(function() {
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient();
  });

  afterEach(function() {
    return test.client.disconnect().then(function() {
      test.client = undefined;
    });
  });

  it('should connect, send, and receive a message', function(done) {
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(message) {
          expect(message).to.exist;
          expect(message.body).to.equal('test');
          done();
        });

        return sender.send('test');
      });
  });

  it('should create sender links', function(done) {
    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('message', function(message) {
          expect(message).to.exist;
          done();
        });

        return sender.send('testing');
      });
  });

  it('should be able to create multiple receivers for same link', function(done) {
    var receviedCount = 0;
    var messageHandler = function(message) {
      expect(message.body).to.equal('TESTMESSAGE');
      receviedCount++;
      if (receviedCount === 2) done();
    };

    test.client.connect(config.address)
      .then(function() {
        return Promise.all([
          test.client.createReceiver(config.defaultLink),
          test.client.createReceiver(config.defaultLink),
          test.client.createSender(config.defaultLink)
        ]);
      })
      .spread(function(receiver1, receiver2, senderLink) {
        receiver1.on('message', messageHandler);
        receiver2.on('message', messageHandler);
        return senderLink.send('TESTMESSAGE');
      });
  });

  it('should be able to detach a link', function() {
    return test.client.connect(config.address)
      .then(function() {
        return test.client.createSender(config.defaultLink);
      })
      .then(function(sender) {
        return sender.detach();
      });
  });

  describe('Messages', function() {
    [
      {
        section: 'properties',
        data: {
          properties: {
            messageId: 42,
            userId: new Buffer('user'),
            to: 'mom',
            subject: 'hello!',
            replyTo: 'amq.topic',
            correlationId: 'msg-001',
            contentType: 'text/plain',
            contentEncoding: 'UTF-8',
            groupId: 'group-one',
            groupSequence: 2,
            replyToGroupId: 'group-two',

            // we've got a very temperamental relationship with
            // timestamps right now...
            absoluteExpiryTime: Math.floor( Date.now() / 1000 ),
            creationTime: Date.now()
          }
        }
      },
      {
        section: 'applicationProperties',
        data: {
          applicationProperties: {
            something: "special"
          }
        }
      },
      {
        section: 'messageAnnotations',
        data: {
          messageAnnotations: {
            "x-foo" : 5,
            "x-bar" : "wibble"
          }
        }
      },
      {
        section: 'deliveryAnnotations',
        data: {
          deliveryAnnotations: {
            "x-foo" : 5,
            "x-bar" : "wibble"
          }
        }
      },
      {
        section: 'header',
        data: {
          header: {
            durable: true,
            priority: 2,
            ttl: 150,
            firstAcquirer: true,

            deliveryCount: undefined  // TODO: what is going on here?
          }
        }
      },
      {
        section: 'footer',
        data: {
          footer: {
            "x-foo" : 5,
            "x-bar" : "wibble"
          }
        }
      }
    ].forEach(function(testCase) {
      it('should send and receive ' + testCase.section + ' sections', function(done) {
        test.client.connect(config.address)
          .then(function() {
            return Promise.all([
              test.client.createReceiver(config.defaultLink),
              test.client.createSender(config.defaultLink)
            ]);
          })
          .spread(function(receiver, sender) {
            receiver.on('message', function(message) {
              expect(message).to.exist;
              // console.log('received: ', message);

              var expected = testCase.data[testCase.section];
              if (testCase.section === 'header') {
                // NOTE: this is flakey because the TTL will be decremented by
                //       the server. So, pull it out, check that its close and delete
                expect(message[testCase.section].ttl).to.be.closeTo(149, 5);

                delete expected.ttl;
                delete message[testCase.section].ttl;
              } else if (testCase.section === 'properties') {
                message[testCase.section].absoluteExpiryTime =
                  message[testCase.section].absoluteExpiryTime.getTime();
                expected.creationTime = new Date(expected.creationTime);
              }

              expect(message[testCase.section]).to.eql(expected);
              done();
            });

           return sender.send('test-' + testCase.section, testCase.data);
          });
      });
    });
  });

});
});
