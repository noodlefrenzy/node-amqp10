var Int64       = require('node-int64'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test-FrameReader'),
    builder     = require('buffer-builder'),
    CBuffer     = require('cbarrick-circular-buffer'),

    constants   = require('../lib/constants'),
    codec       = require('../lib/codec'),

    AMQPError   = require('../lib/types/amqp_error'),
    DescribedType = require('../lib/types/described_type'),
    ForcedType  = require('../lib/types/forced_type'),
    reader      = require('../lib/frames/frame_reader'),

    BeginFrame  = require('../lib/frames/begin_frame'),
    CloseFrame  = require('../lib/frames/close_frame'),
    OpenFrame   = require('../lib/frames/open_frame'),

    tu          = require('./testing_utils');

describe('FrameReader', function() {
    describe('#read()', function() {

        it('should read open frame from ActiveMQ', function () {
            var cbuf = tu.newCBuf([0x00, 0x00, 0x00, 0x17,
                0x02, 0x00, 0x00, 0x00,
                0x00,
                0x53, 0x10,
                0xc0, 0x0a, 0x03,
                0xa1, 0x00,
                0xa1, 0x00,
                0x70, 0x00, 0x10, 0x00, 0x00
            ]);
            var newOpen = reader.read(cbuf);
            (newOpen === undefined).should.be.false;
            newOpen.should.be.instanceof(OpenFrame);
            newOpen.maxFrameSize.should.eql(0x00100000);
        });

        it('should read close frame with error', function() {
            var sizeOfError = (4 + 2 + 19 + 2 + 4 + 3);
            var sizeOfCloseFrameList = (4 + 3 + 1 + 4 + sizeOfError);
            var cbuf = tu.newCBuf([0x00, 0x00, 0x00, (8 + 3 + 1 + 4 + sizeOfCloseFrameList),
                0x02, 0x00, 0x00, 0x00,
                0x00, 0x53, 0x18, // Close frame is list of error
                0xD0, builder.prototype.appendUInt32BE, sizeOfCloseFrameList, builder.prototype.appendUInt32BE, 1,
                0x00, 0x53, 0x1D, // Error
                0xD0, builder.prototype.appendUInt32BE, sizeOfError, builder.prototype.appendUInt32BE, 3,
                0xA3, 19, builder.prototype.appendString, 'amqp:internal-error',
                0xA1, 4, builder.prototype.appendString, 'test',
                0xC1, 1, 0
            ]);
            var newClose = reader.read(cbuf);
            (newClose === undefined).should.be.false;
            newClose.should.be.instanceof(CloseFrame);
            newClose.error.should.be.instanceof(AMQPError);
        });

        it('should read close frame from ActiveMQ', function() {
            var cbuf = tu.newCBuf([0x00, 0x00, 0x00, 0x0c,
                0x02, 0x00, 0x00, 0x00,
                0x00,
                0x53, 0x18, 0x45
            ]);
            var newClose = reader.read(cbuf);
            (newClose === undefined).should.be.false;
            newClose.should.be.instanceof(CloseFrame);
            (newClose.error === undefined).should.be.true;
        });

        it('should read begin frame', function() {
            var frameSize = (1+3+2+2+2+2);
            var cbuf = tu.newCBuf([0x00, 0x00, 0x00, (8+3+2+frameSize),
                0x02, 0x00, 0x00, 0x05,
                0x00, 0x53, 0x11, // Begin
                0xC0, frameSize, 5, // List
                0x60, builder.prototype.appendUInt16BE, 10,
                0x52, 2,
                0x52, 10,
                0x52, 11,
                0x52, 100
            ]);
            var newBegin = reader.read(cbuf);
            (newBegin === undefined).should.be.false;
            newBegin.should.be.instanceof(BeginFrame);
            newBegin.channel.should.eql(5);
            newBegin.remoteChannel.should.eql(10);
            newBegin.nextOutgoingId.should.eql(2);
            newBegin.incomingWindow.should.eql(10);
            newBegin.outgoingWindow.should.eql(11);
            newBegin.handleMax.should.eql(100);
        });

        it('should return undefined on incomplete buffer', function() {
            var cbuf = tu.newCBuf([0x00, 0x00, 0x00, 0x17,
                0x02, 0x00, 0x00, 0x00,
                0x00,
                0x53, 0x10
            ]);
            var newOpen = reader.read(cbuf);
            (newOpen === undefined).should.be.true;
        });
    });
});
