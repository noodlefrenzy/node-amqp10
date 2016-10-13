'use strict';

var expect = require('chai').expect,
    Builder = require('buffer-builder'),
    AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,

    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),

    Policy = require('../../lib/policies/policy'),
    AMQPError = require('../../lib/types/amqp_error'),
    ErrorCondition = require('../../lib/types/error_condition'),
    m = require('../../lib/types/message'),

    test = require('./test-fixture');

var TestPolicy = new Policy({
  connect: { options: { containerId: 'test' } },
  reconnect: { retries: 0, forever: false }
});

function encodeMessagePayload(message) {
  var tmpBuf = new Builder();
  m.encodeMessage(message, tmpBuf);
  return tmpBuf.get();
}

describe('ReceiverLink', function() {
  beforeEach(function() {
    if (!!test.server) test.server = undefined;
    if (!!test.client) test.client = undefined;
    test.client = new AMQPClient(TestPolicy);
    test.server = new MockServer();
    return test.server.setup();
  });

  afterEach(function() {
    if (!test.server) return;
    return test.server.teardown()
      .then(function() {
        test.server = undefined;
      });
  });

  it('should emit optional transfer frames with `message` event', function(done) {
      var message = { body: { test: 'testing' } };
      var messageBuf = encodeMessagePayload(message);
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        function(prev) {
          var rxAttach = frames.readFrame(prev[prev.length-1]);
          return new frames.AttachFrame({
            name: rxAttach.name, handle: 1,
            role: constants.linkRole.sender,
            source: {}, target: {},
            initialDeliveryCount: 0
          });
        },
        function(prev) {
          var txFrame = new frames.TransferFrame({ handle: 1, deliveryId: 1, deliveryTag: 'llamas' });
          txFrame.payload = messageBuf;
          return txFrame;
        },
        new frames.CloseFrame({
          error: new AMQPError({ condition: ErrorCondition.ConnectionForced, description: 'test' })
        })
      ]);

      test.client.connect(test.server.address())
        .then(function() { return test.client.createReceiver('testing'); })
        .then(function(receiver) {
          receiver.on('message', function(msg, frame) {
            expect(msg.body).not.to.be.null;
            expect(msg.body.test).to.eql('testing');
            expect(frame).to.not.be.null;
            expect(frame).to.be.an.instanceOf(frames.TransferFrame);
            expect(frame.deliveryTag).to.eql(new Buffer('llamas'));

            test.client.disconnect().then(function() {
              done();
            });
          });
        });
  });
});
