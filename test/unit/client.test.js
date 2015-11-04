'use strict';

var _ = require('lodash'),
    expect = require('chai').expect,
    Builder = require('buffer-builder'),
    AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,

    constants = require('../../lib/constants'),

    FrameReader = require('../../lib/frames/frame_reader'),
    OpenFrame = require('../../lib/frames/open_frame'),
    BeginFrame = require('../../lib/frames/begin_frame'),
    AttachFrame = require('../../lib/frames/attach_frame'),
    FlowFrame = require('../../lib/frames/flow_frame'),
    TransferFrame = require('../../lib/frames/transfer_frame'),
    CloseFrame = require('../../lib/frames/close_frame'),
    DispositionFrame = require('../../lib/frames/disposition_frame'),

    DefaultPolicy = require('../../lib/policies/default_policy'),
    AMQPError = require('../../lib/types/amqp_error'),
    M = require('../../lib/types/message'),
    Codec = require('../../lib/codec'),
    DeliveryState = require('../../lib/types/delivery_state'),

    test = require('./test-fixture');

DefaultPolicy.connect.options.containerId = 'test';
DefaultPolicy.reconnect.retries = 0;
DefaultPolicy.reconnect.forever = false;

describe('Client', function() {
  describe('#connect()', function() {

    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient();
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

    it('should connect then disconnect', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        new BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 2147483647, outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.disconnect(); });
    });

    it('should connect and receive', function(done) {
      var message = new M.Message({}, { test: 'testing' });
      var tmpBuf = new Builder();
      Codec.encode(message, tmpBuf);
      var messageBuf = tmpBuf.get();
      test.server.setResponseSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        new BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 2147483647, outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        function (prev) {
          var rxAttach = FrameReader.read(prev[prev.length-1]);
          return new AttachFrame({
            name: rxAttach.name, handle: 1, role: constants.linkRole.sender, source: {}, target: {}, initialDeliveryCount: 0
          });
        },
        function (prev) {
          var txFrame = new TransferFrame({
            handle: 1
          });
          txFrame.message = messageBuf;
          return txFrame;
        },
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createReceiver('testing'); })
        .then(function (rxLink) {
          rxLink.on('message', function (msg) {
            expect(msg.body).not.to.be.null;
            expect(msg.body.test).to.eql('testing');
            test.client.disconnect().then(function() {
              done();
            });
          });
        });
    });

    it('should receive multi-frame messages', function(done) {
      var message = new M.Message({}, { test: 'Really long message' });
      var tmpBuf = new Builder();
      Codec.encode(message, tmpBuf);
      var messageBuf = tmpBuf.get();
      var buf1 = messageBuf.slice(0, 10);
      var buf2 = messageBuf.slice(10, 15);
      var buf3 = messageBuf.slice(15);
      test.server.setResponseSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        new BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 2147483647, outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        function (prev) {
          var rxAttach = FrameReader.read(prev[prev.length-1]);
          return new AttachFrame({
            name: rxAttach.name, handle: 1, role: constants.linkRole.sender, source: {}, target: {}, initialDeliveryCount: 0
          });
        },
        [
          function (prev) {
            var txFrame = new TransferFrame({
              handle: 1,
              more: true
            });
            txFrame.message = buf1;
            return txFrame;
          },
          function (prev) {
            var txFrame = new TransferFrame({
              handle: 1,
              more: true
            });
            txFrame.message = buf2;
            return txFrame;
          },
          function (prev) {
            var txFrame = new TransferFrame({
              handle: 1,
              more: false
            });
            txFrame.message = buf3;
            return txFrame;
          }
        ],
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createReceiver('testing'); })
        .then(function (rxLink) {
          rxLink.on('message', function (msg) {
            expect(msg.body).not.to.be.null;
            expect(msg.body.test).to.eql('Really long message');
            test.client.disconnect().then(function() {
              done();
            });
          });
        });
    });

    it('should send multi-frame messages', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new OpenFrame(_.extend(DefaultPolicy.connect.options, {
          maxFrameSize: 10 // <-- the important part, though it will be overwritten with 512
        })),
        new BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 100000,
          outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        [
          function (prev) {
            var rxAttach = FrameReader.read(prev[prev.length-1]);
            return new AttachFrame({
              name: rxAttach.name, handle: 1, role: constants.linkRole.receiver,
              source: {}, target: {}, initialDeliveryCount: 0
            });
          },
          new FlowFrame({
            handle: 1, deliveryCount: 1,
            nextIncomingId: 1, incomingWindow: 2147483647,
            nextOutgoingId: 0, outgoingWindow: 2147483647,
            linkCredit: 500
          })
        ],
        new DispositionFrame({
          role: constants.linkRole.receiver, first: 1, last: 1, settled: true, batchable: false,
          state: new DeliveryState.Accepted()
        }),
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      // build our expected buffer segments
      var messageData = new Array(2048).join('0');
      var message = new M.Message({ body: messageData });
      var codecBuffer = new Builder();
      Codec.encode(message, codecBuffer);
      var messageBuffer = codecBuffer.get();

      var expected = [];
      expected.push(messageBuffer.slice(0, 482));
      expected.push(messageBuffer.slice(482, 964));
      expected.push(messageBuffer.slice(964, 1446));
      expected.push(messageBuffer.slice(1446, 1928));
      expected.push(messageBuffer.slice(1928, 2410));

      // 1. It is an error if the delivery-id on a continuation transfer differs
      // from the delivery-id on the first transfer of a delivery.

      // 2. It is an error if the delivery-tag on a continuation transfer differs
      // from the delivery-tag on the first transfer of a delivery.

      var deliveryTag = new Buffer(Number(1).toString());
      test.server.setExpectedFrameSequence([
        false, false, false, false,
        new TransferFrame({
          channel: 1, handle: 0, deliveryId: 1, settled: false, deliveryTag: deliveryTag,
          message: expected[0], more: true,
        }),
        new TransferFrame({
          channel: 1, handle: 0, deliveryId: 1, settled: false, deliveryTag: deliveryTag,
          message: expected[1], more: true,
        }),
        new TransferFrame({
          channel: 1, handle: 0, deliveryId: 1, settled: false, deliveryTag: deliveryTag,
          message: expected[2], more: true,
        }),
        new TransferFrame({
          channel: 1, handle: 0, deliveryId: 1, settled: false, deliveryTag: deliveryTag,
          message: expected[3], more: true,
        }),
        new TransferFrame({
          channel: 1, handle: 0, deliveryId: 1, settled: false, deliveryTag: deliveryTag,
          message: expected[4], more: false,
        }),
        false
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createSender('test.link'); })
        .then(function(sender) { return sender.send(messageData); })
        .then(function() { return test.client.disconnect(); });
    });

  });
});
