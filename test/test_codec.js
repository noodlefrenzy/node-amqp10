var bitsyntax   = require('bitsyntax'),
    Int64       = require('node-int64'),
    should      = require('should'),
    codec       = require('../lib/codec');

describe('Codec', function() {
    describe('#decode()', function() {

        it('should match fixed values', function () {
            var buffer = new Buffer([0x50, 0x05]);
            var actual = codec.decode(buffer)[0];
            actual.should.eql(5);
        });

        it('should match simple values', function() {
            (codec.decode(new Buffer([0x40]))[0] === null).should.be.true;
            codec.decode(new Buffer([0x41]))[0].should.be.true;
            codec.decode(new Buffer([0x42]))[0].should.be.false;
            codec.decode(new Buffer([0x43]))[0].should.eql(0);
            codec.decode(new Buffer([0x44]))[0].should.eql(new Int64(0));
        });

        it('should match longs', function() {
            var buffer = new Buffer([0x80, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]);
            var actual = codec.decode(buffer)[0];
            actual.should.eql(new Int64(new Buffer([0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80])));
        });

        it('should match floats', function() {
            var expected = new Buffer([0x01, 0x02, 0x03, 0x04]).readFloatBE(0);
            var buffer = new Buffer([0x72, 0x01, 0x02, 0x03, 0x04]);
            var actual = codec.decode(buffer)[0];
            actual.should.eql(expected);

            expected = new Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]).readDoubleBE(0);
            buffer = new Buffer([0x82, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
            actual = codec.decode(buffer)[0];
            actual.should.eql(expected);
        });

        it('should match strings', function() {
            var buffer = new Buffer([0xA1, 0x3, 0x46, 0x4F, 0x4F]);
            var actual = codec.decode(buffer)[0];
            actual.should.eql("FOO");
            buffer = new Buffer([0xB1, 0x0, 0x0, 0x0, 0x3, 0x46, 0x4F, 0x4F]);
            actual = codec.decode(buffer)[0];
            actual.should.eql("FOO");
        });

        it('should fail when not implemented', function() {
            var buffer = new Buffer([0x73, 0x01, 0x02, 0x03, 0x04]);
            (function() { codec.decode(buffer); }).should.throw(Error);
        });
    });

    describe('#encode()', function() {
        it('should encode strings', function () {
            var buffer = new Buffer(5);
            codec.encode('FOO', buffer, 0);
            buffer.toString('hex').should.eql((new Buffer([0xA1, 0x03, 0x46, 0x4F, 0x4F])).toString('hex'));
        });
        it('should encode numbers', function() {
            var buffer = new Buffer(9);
            codec.encode(123.456, buffer, 0);
            var expected = new Buffer(9);
            expected[0] = 0x82;
            expected.writeDoubleBE(123.456, 1);
            expected.toString('hex').should.eql(buffer.toString('hex'));
        });
    });
});
