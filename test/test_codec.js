var Int64       = require('node-int64'),
    CBuffer     = require('cbarrick-circular-buffer'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test-codec'),
    builder     = require('buffer-builder'),

    codec       = require('../lib/codec'),
    AMQPArray   = require('../lib/types/amqp_array'),
    DescribedType = require('../lib/types/described_type'),
    ForcedType  = require('../lib/types/forced_type'),
    Symbol      = require('../lib/types/symbol'),

    tu          = require('./testing_utils');

var newBuf = tu.newBuf;

var newCBuf = tu.newCBuf;

describe('Codec', function() {
    describe('#decode()', function() {

        it('should match fixed values', function () {
            var buffer = newCBuf([0x50, 0x05]);
            var actual = codec.decode(buffer);
            actual[0].should.eql(5);
            actual[1].should.eql(2);
        });

        it('should match simple values', function() {
            (codec.decode(newCBuf([0x40]))[0] === null).should.be.true;
            codec.decode(newCBuf([0x41]))[0].should.be.true;
            codec.decode(newCBuf([0x42]))[0].should.be.false;
            codec.decode(newCBuf([0x43]))[0].should.eql(0);
            codec.decode(newCBuf([0x44]))[0].should.eql(0);
        });

        it('should match longs', function() {
            var buffer = newCBuf([0x80, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]);
            var actual = codec.decode(buffer);
            actual[0].should.eql(new Int64(new Buffer([0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80])));
            actual[1].should.eql(9);
        });

        it('should match floats', function() {
            var expected = new Buffer([0x01, 0x02, 0x03, 0x04]).readFloatBE(0);
            var buffer = newCBuf([0x72, 0x01, 0x02, 0x03, 0x04]);
            var actual = codec.decode(buffer);
            actual[0].should.eql(expected);
            actual[1].should.eql(5);

            expected = new Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]).readDoubleBE(0);
            buffer = newCBuf([0x82, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
            actual = codec.decode(buffer);
            actual[0].should.eql(expected);
            actual[1].should.eql(9);
        });

        it('should match strings', function() {
            var buffer = newCBuf([0xA1, 0x3, 0x46, 0x4F, 0x4F]);
            var actual = codec.decode(buffer);
            actual[0].should.eql("FOO");
            actual[1].should.eql(5);

            buffer = newCBuf([0xB1, 0x0, 0x0, 0x0, 0x3, 0x46, 0x4F, 0x4F]);
            actual = codec.decode(buffer);
            actual[0].should.eql("FOO");
            actual[1].should.eql(8);
        });

        it('should fail when not implemented', function() {
            var buffer = newCBuf([0x73, 0x01, 0x02, 0x03, 0x04]);
            (function() { codec.decode(buffer); }).should.throw(Error);
        });

        it('should decode described types', function() {
            var buffer = newCBuf([0x00, 0xA1, 0x03, builder.prototype.appendString, 'URL', 0xA1, 0x1E, builder.prototype.appendString, 'http://example.org/hello-world' ]);
            var actual = codec.decode(buffer);
            actual[0].should.be.an.instanceof(DescribedType);
            actual[0].descriptor.should.eql('URL');
            actual[0].value.should.eql('http://example.org/hello-world');
        });

        it('should decode forced-type values', function() {
            var buffer = newBuf([0x03, builder.prototype.appendString, 'URL']);
            var actual = codec.decode(buffer, 0, 0xA3);
            actual[0].should.be.instanceof(Symbol);
            actual[0].contents.should.eql('URL');
            actual[1].should.eql(4); // Count + contents
        });

        it('should decode composite example from spec', function() {
            // From Page 25 of AMQP 1.0 spec
            var buffer = newBuf([0x00, 0xA3, 0x11,
                builder.prototype.appendString, 'example:book:list',
                0xC0, 0x40, 0x03, 0xA1, 0x15,
                builder.prototype.appendString, 'AMQP for & by Dummies',
                0xE0, 0x25, 0x02, 0xA1, 0x0E,
                builder.prototype.appendString, 'Rob J. Godfrey',
                0x13,
                builder.prototype.appendString, 'Rafael H. Schloming',
                0x40]);
            console.log('Composite type: ' + buffer.toString('hex'));
            var actual = codec.decode(newCBuf(buffer));
            actual[0].should.eql(new DescribedType(new Symbol('example:book:list'),
                [
                    'AMQP for & by Dummies',
                    [ 'Rob J. Godfrey', 'Rafael H. Schloming'],
                    null
                ]));
        });
    });

    describe('#encode(buffer-builder)', function() {
        it('should encode strings', function () {
            var bufb = new builder();
            codec.encode('FOO', bufb);
            bufb.get().toString('hex').should.eql(newBuf([0xA1, 0x03, 0x46, 0x4F, 0x4F]).toString('hex'));
        });
        it('should encode symbols', function() {
            var bufb = new builder();
            codec.encode(new Symbol('FOO'), bufb);
            bufb.get().toString('hex').should.eql(newBuf([0xA3, 0x03, 0x46, 0x4F, 0x4F]).toString('hex'));
        });
        it('should encode numbers', function() {
            var bufb = new builder();
            codec.encode(123.456, bufb);
            var expected = new Buffer(9);
            expected[0] = 0x82;
            expected.writeDoubleBE(123.456, 1);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));

            bufb = new builder();
            codec.encode(new Int64(0x12, 0x34), bufb);
            var expected = newBuf([0x81, builder.prototype.appendInt32BE, 0x12, builder.prototype.appendInt32BE, 0x34]);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));
        });
        it('should encode described types', function() {
            var bufb = new builder();
            codec.encode(new DescribedType('D1', 'V1'), bufb);
            var expected = newBuf([0x00, 0xA1, 0x2, builder.prototype.appendString, 'D1', 0xA1, 0x2, builder.prototype.appendString, 'V1']);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));
        });
        it('should encode objects as lists when asked', function() {
            var toEncode = {
                foo: 'V1',
                bar: 'V2',
                encodeOrdering: [ 'foo', 'bar' ]
            };
            var expected = newBuf([0xC0, 0x9, 0x2, 0xA1, 0x2, builder.prototype.appendString, 'V1', 0xA1, 0x2, builder.prototype.appendString, 'V2']);
            var bufb = new builder();
            codec.encode(toEncode, bufb);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));
        });
        it('should encode forced-types when asked', function() {
            var toEncode = new ForcedType('uint', 0x123);
            var expected = newBuf([0x70, 0x00, 0x00, 0x01, 0x23]);
            var bufb = new builder();
            codec.encode(toEncode, bufb);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));
        });
        it('should encode null', function() {
            var toEncode = null;
            var expected = newBuf([0x40]);
            var bufb = new builder();
            codec.encode(toEncode, bufb);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));
        });
        it('should encode amqp arrays', function() {
            var amqpArray = new AMQPArray([ 1, 2, 3], 0x71);
            var expected = newBuf([0xE0,
                /* size = (int32*3 + count + constructor) */ builder.prototype.appendUInt8, (4*3+1+1),
                /* count */ builder.prototype.appendUInt8, 3, /* constructor */ 0x71,
                builder.prototype.appendUInt32BE, 1, builder.prototype.appendUInt32BE, 2, builder.prototype.appendUInt32BE, 3
            ]);
            var bufb = new builder();
            codec.encode(amqpArray, bufb);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));
        });
        it('should encode composite example from spec', function() {
            // From Page 25 of AMQP 1.0 spec
            var expected = newBuf([0x00, 0xA3, 0x11,
                builder.prototype.appendString, 'example:book:list',
                0xC0, 0x40, 0x03, 0xA1, 0x15,
                builder.prototype.appendString, 'AMQP for & by Dummies',
                0xE0, 0x25, 0x02, 0xA1, 0x0E,
                builder.prototype.appendString, 'Rob J. Godfrey',
                0x13,
                builder.prototype.appendString, 'Rafael H. Schloming',
                0x40]);
            var bufb = new builder();
            codec.encode(new DescribedType(new Symbol('example:book:list'),
                [
                    'AMQP for & by Dummies',
                    new AMQPArray([ 'Rob J. Godfrey', 'Rafael H. Schloming'], 0xA1),
                    null
                ]), bufb);
            bufb.get().toString('hex').should.eql(expected.toString('hex'));
        });
    });
});
