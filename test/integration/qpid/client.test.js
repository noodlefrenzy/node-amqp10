'use strict';
var AMQPClient = require('../../..').Client,
    Message = require('../../../lib/types/message'),
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
        return test.client.createReceiver(config.defaultLink, null, function(err, message) {
          expect(err).to.not.exist;
          expect(message).to.exist;
          done();
        });
      })
      .then(function() {
        return test.client.send('test', config.defaultLink);
      })
      .catch(function(err) {
        expect(err).to.not.exist;
      });
  });

  describe('Messages', function() {
    [
      {
        option: 'properties', type: Message.Properties,
        options: {
          properties: {
            messageId: 42,
            userId: 'user',
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
            absoluteExpiryTime: null,
            creationTime: null
          }
        }
      },
      {
        option: 'applicationProperties', type: Message.ApplicationProperties,
        options: {
          applicationProperties: {
            something: "special"
          }
        }
      },
      {
        option: 'annotations', type: Message.Annotations,
        options: {
          annotations: {
            "x-foo" : 5,
            "x-bar" : "wibble"
          }
        }
      },
      {
        option: 'deliveryAnnotations', type: Message.DeliveryAnnotations,
        options: {
          deliveryAnnotations: {
            "x-foo" : 5,
            "x-bar" : "wibble"
          }
        }
      },
      {
        option: 'header', type: Message.Header,
        options: {
          header: {
            durable: true,
            priority: 2,
            ttl: 150,
            firstAcquirer: true,
            deliveryCount: 0  // this is the default, qpid doesn't seem to do
                              // anything when I send a value
          }
        }
      },
      {
        option: 'footer', type: Message.Footer,
        options: {
          footer: {
            "x-foo" : 5,
            "x-bar" : "wibble"
          }
        }
      }
    ].forEach(function(testCase) {
      it('should send and receive ' + testCase.option + ' options', function(done) {
        test.client.connect(config.address)
          .then(function() {
            return test.client.createReceiver(config.defaultLink, null, function(err, message) {
              expect(err).to.not.exist;
              expect(message).to.exist;

              var expected = new testCase.type(testCase.options[testCase.option]);
              if (testCase.option === 'header') {
                // NOTE: this is flakey because the TTL will be decremented by
                //       the server. So, pull it out, check that its close and delete

                expect(message[testCase.option].ttl).to.be.closeTo(149, 5);

                delete expected.ttl;
                delete message[testCase.option].ttl;
              }

              expect(message[testCase.option]).to.eql(expected);
              done();
            });
          })
          .then(function() {
            return test.client.send('test-' + testCase.option, config.defaultLink, testCase.options);
          })
          .catch(function(err) {
            expect(err).to.not.exist;
          });
      });
    });
  });

});
});
