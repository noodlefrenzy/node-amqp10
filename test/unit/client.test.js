'use strict';

var expect = require('chai').expect,
    BufferList = require('bl'),
    Builder = require('buffer-builder'),
    AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,

    constants = require('../../lib/constants'),

    FrameReader = require('../../lib/frames/frame_reader'),
    OpenFrame = require('../../lib/frames/open_frame'),
    BeginFrame = require('../../lib/frames/begin_frame'),
    AttachFrame = require('../../lib/frames/attach_frame'),
    TransferFrame = require('../../lib/frames/transfer_frame'),
    CloseFrame = require('../../lib/frames/close_frame'),

    DefaultPolicy = require('../../lib/policies/default_policy'),
    AMQPError = require('../../lib/types/amqp_error'),
    M = require('../../lib/types/message'),
    Codec = require('../../lib/codec'),

    test = require('./test-fixture');

DefaultPolicy.connect.options.containerId = 'test';

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

    it('should connect then disconnect', function(done) {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        new BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 2147483647, outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.server.address())
        .then(function() {
          return test.client.disconnect().then(function() {
            done();
          });
        });
    });

    it('should connect and receive', function(done) {
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
          txFrame.message = new M.Message({}, { test: 'testing' });
          return txFrame;
        },
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.server.address())
        .then(function() {
          return test.client.createReceiver('testing');
        })
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
      var message = new M.Message({}, { test: 'testing' });
      var tmpBuf = new Builder();
      Codec.encode(message, tmpBuf);
      var messageBuf = tmpBuf.get();
      var buf1 = messageBuf.slice(0, 10);
      var buf2 = messageBuf.slice(10);
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
          txFrame.message = buf1;
          return txFrame;
        },
        function (prev) {
          var txFrame = new TransferFrame({
            handle: 1
          });
          txFrame.message = buf2;
          return txFrame;
        },
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.server.address())
        .then(function() {
          return test.client.createReceiver('testing');
        })
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
  });
});
