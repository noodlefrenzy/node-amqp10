var Int64       = require('node-int64'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test_frame_encodings'),
    builder     = require('buffer-builder'),

    codec       = require('../lib/codec'),
    constants   = require('../lib/constants'),

    AMQPError   = require('../lib/types/amqp_error'),
    DescribedType = require('../lib/types/described_type'),
    ForcedType  = require('../lib/types/forced_type'),
    Symbol      = require('../lib/types/symbol'),
    Source      = require('../lib/types/source_target').Source,
    Target      = require('../lib/types/source_target').Target,

    AttachFrame = require('../lib/frames/attach_frame'),
    BeginFrame  = require('../lib/frames/begin_frame'),
    FlowFrame   = require('../lib/frames/flow_frame'),
    OpenFrame   = require('../lib/frames/open_frame'),
    TransferFrame   = require('../lib/frames/transfer_frame'),

    tu          = require('./testing_utils');

describe('OpenFrame', function() {
    describe('#outgoing()', function() {
        it('should encode performative correctly', function () {
            var open = new OpenFrame({ containerId: 'test', hostname: 'localhost' });
            var actual = open.outgoing();
            var expected = tu.newBuf([
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
                0xa3, 5, builder.prototype.appendString, constants.defaultOutgoingLocales.contents,
                0xa3, 5, builder.prototype.appendString, constants.defaultIncomingLocales.contents,
                0x40, 0x40, 0xc1, 0x01, 0x00
            ]);
            actual.toString('hex').should.eql(expected.toString('hex'));
        });
    });
});

describe('BeginFrame', function() {
   describe('#outgoing()', function() {
      it('should encode performative correctly', function() {
          var begin = new BeginFrame({ nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100 });
          begin.channel = 1;
          var actual = begin.outgoing();
          var expected = tu.newBuf([
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
          actual.toString('hex').should.eql(expected.toString('hex'));
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
            var expected = tu.newBuf([
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
                    0x45,
                    0x45,
                0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 0x29, // target
                    0xc0, targetSize, 7,
                    0xA1, 7, builder.prototype.appendString, 'testtgt',
                    0x43,
                    0xA3, 11, builder.prototype.appendString, 'session-end',
                    0x43,
                    0x42,
                    0xc1, 1, 0,
                    0x45,
                0xc1, 1, 0,
                0x42,
                0x52, 1,
                0x44,
                0x40,
                0x40,
                0xc1, 1, 0
            ]);
            actual.toString('hex').should.eql(expected.toString('hex'));
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
            var expected = tu.newBuf([
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
            actual.toString('hex').should.eql(expected.toString('hex'));
        });
    });
});

describe('TransferFrame', function() {
    describe('#outgoing()', function() {
        it('should encode performative correctly', function() {
            var transfer = new TransferFrame({

            });
            transfer.channel = 1;
            var actual = transfer.outgoing();
            var listSize = 0;
            var frameSize = 8 + 1 + 9 + 2 + listSize;
            var expected = tu.newBuf([
                0x00, 0x00, 0x00, frameSize,
                0x02, 0x00, 0x00, 0x01,
                0x00,
                0x80, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x14,
                0xc0, listSize, 12,
            ]);
            actual.toString('hex').should.eql(expected.toString('hex'));
        });
    });
});
