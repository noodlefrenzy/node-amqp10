var Int64       = require('node-int64'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test-FrameReader'),
    builder     = require('buffer-builder'),

    codec       = require('../lib/codec'),
    DescribedType = require('../lib/types/described_type'),
    ForcedType  = require('../lib/types/forced_type'),
    FrameReader = require('../lib/frames/frame_reader'),
    OpenFrame   = require('../lib/frames/open_frame');

function newBuf(contents) {
    var bufb = new builder();
    for (var idx = 0; idx < contents.length; idx++) {
        var cur = contents[idx];
        if (typeof cur === 'function') {
            cur.call(bufb, contents[++idx]);
        } else {
            bufb.appendUInt8(cur);
        }
    }
    return bufb.get();
}

describe('FrameReader', function() {
    describe('#read()', function() {

        it('should read open frame from described list', function () {
            var open = new OpenFrame();
            open.hostname = 'Foo.com'
            open.max_frame_size = 0xFFFF;
            var fromStream = new DescribedType(OpenFrame.Descriptor, []);
            var performative = open._getPerformative();
            for (var idx in performative.value.encodeOrdering) {
                var field = performative.value.encodeOrdering[idx];
                var curVal = performative.value[field];
                fromStream.value.push(curVal instanceof ForcedType ? curVal.value : curVal);
            }
            var reader = new FrameReader();
            var newOpen = reader.read(fromStream);
            (newOpen === null).should.be.false;
            newOpen.hostname.should.eql(open.hostname);
            newOpen.max_frame_size.should.eql(open.max_frame_size);
        });

        it('should return null on non-match', function() {
            var badType = new DescribedType(new Int64(0x00000000, 0xFFFFFFFF), 'Should not match');
            var reader = new FrameReader();
            var actual = reader.read(badType);
            (actual === null).should.be.true;
        });
    });
});
