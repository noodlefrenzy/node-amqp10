var Int64       = require('node-int64'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test_frame_encodings'),
    builder     = require('buffer-builder'),

    codec       = require('../lib/codec'),
    DescribedType = require('../lib/described_type'),
    ForcedType  = require('../lib/forced_type'),
    FrameBase   = require('../lib/frames/frame'),
    OpenFrame   = require('../lib/frames/open_frame'),

    tu          = require('./testing_utils');

describe('OpenFrame', function() {
    describe('#outgoing()', function() {
/*
        it('should encode performative correctly', function () {
            var open = new OpenFrame();
            var actual = open.outgoing();
            var expected = tu.newBuf([
                0x00, 0x00, 0x00, 0x39, // size
                0x02, 0x00, 0x00, 0x00, // DOFF
                // No Extended Header
                0x00

            ]);
            actual.toString('hex').should.eql(expected.toString('hex'));
        });
        */
    });
});

