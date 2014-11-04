var Int64       = require('node-int64'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test-FrameReader'),
    builder     = require('buffer-builder'),
    CBuffer     = require('cbarrick-circular-buffer'),

    codec       = require('../lib/codec'),
    DescribedType = require('../lib/types/described_type'),
    ForcedType  = require('../lib/types/forced_type'),
    reader      = require('../lib/frames/frame_reader'),
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
            newOpen.max_frame_size.should.eql(0x00100000);
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
