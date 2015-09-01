'use strict';
var AMQPClient = require('../../../../lib/index.js').Client,
  Policy = require('../../../../lib/index').Policy,
  Message = require('../../../../lib/types/message'),
  Promise = require('bluebird'),
  config = require('./config'),
  expect = require('chai').expect,
  uuid = require('uuid'),
  debug = require('debug')('amqp10:test:servicebus:queues'),
  _ = require('lodash'),

  M = require('../../../../lib/types/message');

var test = {};
describe('ServiceBus', function() {
  describe('EventHubs', function() {

    beforeEach(function() {
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(Policy.ServiceBusQueue);
    });

    afterEach(function() {
      return test.client.disconnect().then(function() {
        test.client = undefined;
      });
    });

    it('should connect, send, and receive a message', function(done) {
      var msgVal = uuid.v4();
      expect(config.senderLink, 'Required environment variables').to.exist;
      test.client.connect(config.address)
        .then(function() {
          return Promise.all(_.range(config.partitionCount).
            map(function(partition) { return test.client.createReceiver(config.receiverLinkPrefix + partition); }).
            concat(test.client.createSender(config.senderLink)));
        })
        .then(function(links) {
          var sender = links.pop();
          _.each(links, function(receiver) {
            receiver.on('message', function (message) {
              expect(message).to.exist;
              expect(message.body).to.exist;
              // Ignore messages that aren't from us.
              if (!!message.body.DataValue && message.body.DataValue === msgVal) {
                done();
              }
            });
          });

          return sender.send({"DataString": "From Node v2", "DataValue": msgVal});
        });
    });
    /*
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

     it('should return the same link when one sender link is attaching', function() {
     return test.client.connect(config.address)
     .then(function() {
     return Promise.all([
     test.client.createSender(config.defaultLink),
     test.client.createSender(config.defaultLink)
     ]);
     })
     .spread(function(first, second) {
     expect(first).to.eql(second);
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
     return Promise.all([
     test.client.createReceiver(config.defaultLink),
     test.client.createSender(config.defaultLink)
     ]);
     })
     .spread(function(receiver, sender) {
     receiver.on('message', function(message) {
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

     return sender.send('test-' + testCase.option, testCase.options);
     });
     });
     });
     });
     */
  });
});
