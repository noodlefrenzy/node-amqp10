'use strict';

var Int64 = require('node-int64'),
    should = require('should'),
    debug = require('debug')('amqp10-test_frame_encodings'),
    builder = require('buffer-builder'),

    codec = require('../lib/codec'),
    constants = require('../lib/constants'),

    AMQPError = require('../lib/types/amqp_error'),
    DescribedType = require('../lib/types/described_type'),
    ForcedType = require('../lib/types/forced_type'),
    Source = require('../lib/types/source_target').Source,
    Target = require('../lib/types/source_target').Target,
    Delivery = require('../lib/types/delivery_state'),
    M = require('../lib/types/message'),

    AttachFrame = require('../lib/frames/attach_frame'),
    BeginFrame = require('../lib/frames/begin_frame'),
    FlowFrame = require('../lib/frames/flow_frame'),
    OpenFrame = require('../lib/frames/open_frame'),
    TransferFrame = require('../lib/frames/transfer_frame'),
    HeartbeatFrame = require('../lib/frames/heartbeat_frame'),

    Sasl = require('../lib/frames/sasl_frame'),

    tu = require('./testing_utils');

describe('OpenFrame', function() {
  describe('#outgoing()', function() {
    it('should encode performative correctly', function() {
      var open = new OpenFrame({ containerId: 'test', hostname: 'localhost' });
      var actual = open.outgoing();
      var expected = tu.buildBuffer([
        0x00, 0x00, 0x00, 0x46,
        0x02, 0x00, 0x00, 0x00,
        0x00,
        0x80, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x10,
        0xc0, 0x32, 0x0a, // list
        0xa1, 4, builder.prototype.appendString, 'test',
        0xa1, 9, builder.prototype.appendString, 'localhost',
        0x70, builder.prototype.appendUInt32BE, constants.defaultMaxFrameSize,
        0x60, builder.prototype.appendUInt16BE, constants.defaultChannelMax,
        0x70, builder.prototype.appendUInt32BE, constants.defaultIdleTimeout,
        0xa3, 5, builder.prototype.appendString, constants.defaultOutgoingLocales,
        0xa3, 5, builder.prototype.appendString, constants.defaultIncomingLocales,
        0x40, 0x40, 0xc1, 0x01, 0x00
      ]);
      tu.shouldBufEql(expected, actual);
    });
  });
});

describe('BeginFrame', function() {
  describe('#outgoing()', function() {
    it('should encode performative correctly', function() {
      var begin = new BeginFrame({ nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100 });
      begin.channel = 1;
      var actual = begin.outgoing();
      var expected = tu.buildBuffer([
        0x00, 0x00, 0x00, 0x26,
        0x02, 0x00, 0x00, 0x01,
        0x00,
        0x80, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x11,
        0xc0, 0x12, 0x08, // list
        0x40,
        0x52, 0x01,
        0x52, 0x64,
        0x52, 0x64,
        0x70, builder.prototype.appendUInt32BE, constants.defaultHandleMax,
        0x40, 0x40, 0xc1, 0x01, 0x00
      ]);
      tu.shouldBufEql(expected, actual);
    });
  });
});

describe('AttachFrame', function() {
  describe('#outgoing()', function() {
    it('should encode performative correctly', function() {
      var attach = new AttachFrame({
        name: 'test',
        handle: 1,
        role: constants.linkRole.sender,
        source: new Source({ address: null, dynamic: true }),
        target: new Target({ address: 'testtgt' }),
        initialDeliveryCount: 1 });
      attach.channel = 1;
      var actual = attach.outgoing();
      var sourceSize = 1 + 1 + 1 + 13 + 1 + 1 + 3 + 1 + 3 + 1 + 1 + 1;
      var targetSize = 1 + 9 + 1 + 13 + 1 + 1 + 3 + 1;
      var listSize = 1 + 6 + 2 + 1 + 2 + 2 + 10 + 2 + sourceSize + 10 + 2 + targetSize + 3 + 1 + 2 + 1 + 1 + 1 + 3;
      var listCount = 14;
      var frameSize = 8 + 1 + 9 + 2 + listSize;
      var expected = tu.buildBuffer([
        0x00, 0x00, 0x00, frameSize,
        0x02, 0x00, 0x00, 0x01,
        0x00,
        0x80, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x12,
        0xc0, listSize, listCount,
        0xA1, 4, builder.prototype.appendString, 'test',
        0x52, 1, // handle
        0x42, // role=sender
        0x50, 2, // sender-settle-mode=mixed
        0x50, 0, // rcv-settle-mode=first
        0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 0x28, // source
        0xc0, sourceSize, 11,
        0x40,
        0x43,
        0xA3, 11, builder.prototype.appendString, 'session-end',
        0x43,
        0x41,
        0xc1, 1, 0,
        0x40,
        0xc1, 1, 0,
        0x40,
        0x40,
        0x40,
        0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 0x29, // target
        0xc0, targetSize, 7,
        0xA1, 7, builder.prototype.appendString, 'testtgt',
        0x43,
        0xA3, 11, builder.prototype.appendString, 'session-end',
        0x43,
        0x42,
        0xc1, 1, 0,
        0x40,
        0xc1, 1, 0,
        0x42,
        0x52, 1,
        0x44,
        0x40,
        0x40,
        0xc1, 1, 0
      ]);
      tu.shouldBufEql(expected, actual);
    });
  });
});

describe('FlowFrame', function() {
  describe('#outgoing()', function() {
    it('should encode performative correctly', function() {
      var flow = new FlowFrame({
        nextIncomingId: 1,
        incomingWindow: 100,
        nextOutgoingId: 1,
        outgoingWindow: 100,
        handle: 1,
        deliveryCount: 2,
        linkCredit: 100,
        available: 0,
        drain: false,
        echo: true
      });
      flow.channel = 1;
      var actual = flow.outgoing();
      var listSize = 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 1 + 1 + 1 + 3;
      var frameSize = 8 + 1 + 9 + 2 + listSize;
      var expected = tu.buildBuffer([
        0x00, 0x00, 0x00, frameSize,
        0x02, 0x00, 0x00, 0x01,
        0x00,
        0x80, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x13,
        0xc0, listSize, 11,
        0x52, 1,
        0x52, 100,
        0x52, 1,
        0x52, 100,
        0x52, 1,
        0x52, 2,
        0x52, 100,
        0x43,
        0x42,
        0x41,
        0xc1, 1, 0
      ]);
      tu.shouldBufEql(expected, actual);
    });
  });
});

describe('TransferFrame', function() {
  describe('#outgoing()', function() {
    it('should encode performative correctly', function() {
      var transfer = new TransferFrame({
        handle: 1,
        deliveryId: 1,
        deliveryTag: tu.buildBuffer([1]),
        messageFormat: 20000,
        settled: true,
        receiverSettleMode: constants.receiverSettleMode.autoSettle
      });
      transfer.channel = 1;
      transfer.message = new M.Message();
      transfer.message.body.push(new ForcedType('uint', 10));
      var actual = transfer.outgoing();
      var payloadSize = 12;
      var listSize = 1 + 2 + 2 + 3 + 5 + 1 + 1 + 2 + 1 + 1 + 1 + 1;
      var frameSize = 8 + 1 + 9 + 2 + listSize + payloadSize;
      var expected = tu.buildBuffer([
        0x00, 0x00, 0x00, frameSize,
        0x02, 0x00, 0x00, 0x01,
        0x00,
        0x80, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x14,
        0xc0, listSize, 11,
        0x52, 1, // handle
        0x52, 1, // delivery-id
        0xA0, 1, 1, // delivery-tag
        0x70, builder.prototype.appendUInt32BE, 20000, // message-format
        0x41, // settled
        0x42, // more
        0x50, 0, // rcv-settle-mode
        0x40, // state
        0x42, 0x42, 0x42, // resume/aborted/batchable
        // Message Body - amqp-value of uint(10)
        0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 0x77,
        0x52, 10
      ]);
      tu.shouldBufEql(expected, actual);
    });
  });
});

describe('SaslFrames', function() {
  describe('SaslMechanisms', function() {
    describe('#outgoing()', function() {
      it('should encode correctly', function() {
        var mechanisms = new Sasl.SaslMechanisms();
        var actual = mechanisms.outgoing();
        var frameSize = 8 + 1 + 9 + 3 + 2 + 'ANONYMOUS'.length;
        var expected = tu.buildBuffer([
          0x00, 0x00, 0x00, frameSize,
          0x02, 0x01, 0x00, 0x00,
          0x00,
          0x80, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x40,
          0xC0, 9 + 3, 1,
          0xA3, 9, builder.prototype.appendString, 'ANONYMOUS'
        ]);
        tu.shouldBufEql(expected, actual);
      });
    });
  });
});

describe('HeartbeatFrame', function() {
  describe('#outgoing()', function() {
    it('should encode correctly', function() {
      var heartbeat = new HeartbeatFrame();
      var actual = heartbeat.outgoing();
      var expected = tu.buildBuffer([0, 0, 0, 8, 2, 0, 0, 0]);
      tu.shouldBufEql(expected, actual);
    });
  });
});
