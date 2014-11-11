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

