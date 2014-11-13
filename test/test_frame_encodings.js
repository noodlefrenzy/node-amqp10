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
    OpenFrame   = require('../lib/frames/open_frame'),

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
            var frameSize = 8 + 1 + 9 + 2 + listSize;
            var listSize = 0;
            var expected = tu.newBuf([
                0x00, 0x00, 0x00, frameSize,
                0x02, 0x00, 0x00, 0x01,
                0x00,
                0x80, 0x00, 0x00, 0x00, 0x00,
                      0x00, 0x00, 0x00, 0x12,
                0xc0, listSize, 12,
                0xA1, 4, builder.prototype.appendString, 'test',
                0x52, 1, // handle
                0x42, // role=sender
                0x50, 2, // sender-settle-mode=mixed
                0x50, 0, // rcv-settle-mode=first
                0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 28, // source
                    0x40,
                    0x43,
                    0xA3, 11, builder.prototype.appendString, 'session-end',
                    0x43, 0x42, 0xc1, 1, 0, 0x40, 0xc1, 1, 0, 0x40, 0x40,
                0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 29, // target
                    0xA1, 7, builder.prototype.appendString, 'testtgt',
                    0x43,
                    0xA3, 11, builder.prototype.appendString, 'session-end',
                    0x43, 0x42, 0xc1, 1, 0, 0x40,
                0xc1, 1, 0,
                0x42,
                0x52, 1,
                0x44, 0x40, 0x40, 0xc1, 1, 0
            ]);
        });
    });
});
