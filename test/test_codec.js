var Int64       = require('node-int64'),
    CBuffer     = require('cbarrick-circular-buffer'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test-codec'),
    builder     = require('buffer-builder'),

    codec       = require('../lib/codec'),
    AMQPArray   = require('../lib/types/amqp_composites').Array,
    AMQPError   = require('../lib/types/amqp_error'),
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
            codec.decode(newCBuf([0x44]))[0].should.eql(new Int64(0,0));
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

        it('should match buffers', function() {
            var buffer = newCBuf([0xA0, 0x3, 0x7b, 0x22, 0x7d]);
            var actual = codec.decode(buffer);
            actual[0].should.be.instanceof(Buffer);
            tu.shouldBufEql(newBuf([0x7b, 0x22, 0x7d]), actual[0]);
            actual[1].should.eql(5);
        });

        it('should fail when not implemented', function() {
            var buffer = newCBuf([0x73, 0x01, 0x02, 0x03, 0x04]);
            (function() { codec.decode(buffer); }).should.throw(Error);
        });

        it('should decode described types', function() {
            var buffer = newCBuf([0x00, 0xA1, 0x03, builder.prototype.appendString, 'URL', 0xA1, 0x1E, builder.prototype.appendString, 'http://example.org/hello-world' ]);
            var actual = codec.decode(buffer);
            actual[0].should.be.instanceof(DescribedType);
            actual[0].descriptor.should.eql('URL');
            actual[0].value.should.eql('http://example.org/hello-world');
        });

        it('should decode nested described types', function() {
            var buffer = newCBuf([0x00, 0xA1, 3, builder.prototype.appendString, 'FOO', 0x00, 0xA1, 3, builder.prototype.appendString, 'BAR', 0xA1, 3, builder.prototype.appendString, 'BAZ']);
            var actual = codec.decode(buffer);
            actual[0].should.be.instanceof(DescribedType);
            actual[0].value.should.be.instanceof(DescribedType);
            actual[0].descriptor.should.eql('FOO');
            actual[0].value.descriptor.should.eql('BAR');
            actual[0].value.value.should.eql('BAZ');
        });

        it('should decode nested described and composites', function() {
            // Described (int64(0x1), [ Described(int64(0x2), 'VAL') ])
            var buffer = newCBuf([0x00, 0x53, 0x1, 0xC0, (1+1+2+1+1+3), 1, 0x00, 0x53, 0x2, 0xA1, 3, builder.prototype.appendString, 'VAL']);
            var actual = codec.decode(buffer);
            actual[0].should.be.instanceof(DescribedType);
            actual[0].value.should.be.instanceof(Array);
            actual[0].descriptor.should.eql(new Int64(0, 1));
            actual[0].value.length.should.eql(1);
            actual[0].value[0].should.be.instanceof(DescribedType);
            actual[0].value[0].descriptor.should.eql(new Int64(0, 2));
            actual[0].value[0].value.should.eql('VAL');
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

        it('should decode open frame received from ActiveMQ', function() {
            var buffer = newBuf([0x00,
                0x53, 0x10,
                0xc0, 0x0a, 0x03,
                0xa1, 0x00,
                0xa1, 0x00,
                0x70, 0x00, 0x10, 0x00, 0x00]);
            var actual = codec.decode(newCBuf(buffer));
            actual[0].should.eql(new DescribedType(new Int64(0, 0x10), [ '', '', 0x00100000 ]));
        });

        it('should decode known type (AMQPError) from described type', function() {
            var buffer = newBuf([0x00, 0x53, 0x1D,
                0xD0, builder.prototype.appendUInt32BE, (4 + 2 + 19 + 2 + 4 + 3), builder.prototype.appendUInt32BE, 3,
                0xA3, 19, builder.prototype.appendString, 'amqp:internal-error',
                0xA1, 4, builder.prototype.appendString, 'test',
                0xC1, 1, 0x0 // empty info map
            ]);
            var actual = codec.decode(newCBuf(buffer));
            (actual === undefined).should.be.false;
            actual[0].should.be.instanceof(AMQPError);
            actual[0].condition.contents.should.eql('amqp:internal-error');
            actual[0].description.should.eql('test');
        });
    });

    describe('#encode(buffer-builder)', function() {
        it('should encode strings', function () {
            var bufb = new builder();
            codec.encode('FOO', bufb);
            tu.shouldBufEql([0xA1, 0x03, 0x46, 0x4F, 0x4F], bufb);
        });
        it('should encode symbols', function() {
            var bufb = new builder();
            codec.encode(new Symbol('FOO'), bufb);
            tu.shouldBufEql([0xA3, 0x03, 0x46, 0x4F, 0x4F], bufb);
        });
        it('should encode buffers', function() {
            var bufb = new builder();
            codec.encode(newBuf([0xFF]), bufb);
            tu.shouldBufEql([0xA0, 1, 0xFF], bufb);
        });
        it('should encode long buffers', function() {
            var bufb = new builder();
            bufb.appendUInt8(0xB0);
            bufb.appendUInt32BE(1024 * 4);
            for (var idx = 0; idx < 1024; ++idx) {
                bufb.appendUInt32BE(idx);
            }
            var expected = bufb.get();
            var encoded = expected.slice(5);
            var actual = new builder();
            codec.encode(encoded, actual);
            tu.shouldBufEql(expected, actual);
        });
        it('should encode numbers', function() {
            var bufb = new builder();
            codec.encode(123.456, bufb);
            var expected = new Buffer(9);
            expected[0] = 0x82;
            expected.writeDoubleBE(123.456, 1);
            tu.shouldBufEql(expected, bufb);

            bufb = new builder();
            codec.encode(new Int64(0x12, 0x34), bufb);
            var expected = newBuf([0x80, builder.prototype.appendInt32BE, 0x12, builder.prototype.appendInt32BE, 0x34]);
            tu.shouldBufEql(expected, bufb);

            bufb = new builder();
            codec.encode(new Int64(0xFFFFFFFF, 0xFFFFFF00), bufb);
            var expected = newBuf([0x81, builder.prototype.appendInt32BE, 0xFFFFFFFF, builder.prototype.appendInt32BE, 0xFFFFFF00]);
            tu.shouldBufEql(expected, bufb);
        });
        it('should encode lists', function() {
            var list = [ 1, 'foo' ];
            var expected = newBuf([0xC0, (1+5+5), 2, 0x71, 0, 0, 0, 1, 0xA1, 3, builder.prototype.appendString, 'foo' ]);
            var bufb = new builder();
            codec.encode(list, bufb);
            tu.shouldBufEql(expected, bufb);

            list = [];
            expected = newBuf([0x45]);
            bufb = new builder();
            codec.encode(list, bufb);
            tu.shouldBufEql(expected, bufb);
        });
        it('should encode described types', function() {
            var bufb = new builder();
            codec.encode(new DescribedType('D1', 'V1'), bufb);
            var expected = newBuf([0x00, 0xA1, 0x2, builder.prototype.appendString, 'D1', 0xA1, 0x2, builder.prototype.appendString, 'V1']);
            tu.shouldBufEql(expected, bufb);
        });
        it('should encode described types with no values', function() {
            var bufb = new builder();
            codec.encode(new DescribedType(new Int64(0x0, 0x26)), bufb);
            var expected = newBuf([0x00, 0x80, 0, 0, 0, 0, 0, 0, 0, 0x26, 0x45]);
            tu.shouldBufEql(expected, bufb);
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
            tu.shouldBufEql(expected, bufb);
        });
        it('should encode forced-types when asked', function() {
            var toEncode = new ForcedType('uint', 0x123);
            var expected = newBuf([0x70, 0x00, 0x00, 0x01, 0x23]);
            var bufb = new builder();
            codec.encode(toEncode, bufb);
            tu.shouldBufEql(expected, bufb);
        });
        it('should encode null', function() {
            var toEncode = null;
            var expected = newBuf([0x40]);
            var bufb = new builder();
            codec.encode(toEncode, bufb);
            tu.shouldBufEql(expected, bufb);
        });
        it('should encode ForcedType with null value as null', function() {
            var toEncode = new ForcedType('uint', null);
            var expected = newBuf([0x40]);
            var bufb = new builder();
            codec.encode(toEncode, bufb);
            tu.shouldBufEql(expected, bufb);
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
            tu.shouldBufEql(expected, bufb);
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
            tu.shouldBufEql(expected, bufb);
        });
        it('should encode frame performative correctly', function() {
            var performative = new DescribedType(new Int64(0x00000000, 0x00000010), {
                id: 'client', /* string */
                hostname: 'localhost', /* string */
                maxFrameSize: new ForcedType('uint', 512), /* uint */
                channelMax: new ForcedType('ushort', 10), /* ushort */
                idleTimeout: new ForcedType('uint', 1000), /* milliseconds */
                outgoingLocales: new Symbol('en-US'), /* ietf-language-tag (symbol) */
                incomingLocales: new Symbol('en-US'), /* ietf-language-tag (symbol) */
                offeredCapabilities: null, /* symbol */
                desiredCapabilities: null, /* symbol */
                properties: {}, /* fields (map) */
                encodeOrdering: [ 'id', 'hostname', 'maxFrameSize', 'channelMax', 'idleTimeout', 'outgoingLocales',
                    'incomingLocales', 'offeredCapabilities', 'desiredCapabilities', 'properties']
            });
            var expected = newBuf([0x00,
                0x80, builder.prototype.appendUInt32BE, 0x0, builder.prototype.appendUInt32BE, 0x10, // Descriptor
                // 0xD0, builder.prototype.appendUInt32BE, 0x0, builder.prototype.appendUInt32BE, 0x0, // List (size & count)
                0xC0, (1 + 8 + 11 + 5 + 3 + 5 + 7 + 7 + 1 + 1 + 3), 10,
                0xA1, 0x6, builder.prototype.appendString, 'client', // ID
                0xA1, 0x9, builder.prototype.appendString, 'localhost', // Hostname
                0x70, builder.prototype.appendUInt32BE, 512, // Max Frame Size
                0x60, builder.prototype.appendUInt16BE, 10, // Channel Max
                0x70, builder.prototype.appendUInt32BE, 1000, // Idle Timeout
                0xA3, 0x5, builder.prototype.appendString, 'en-US', // Outgoing Locales
                0xA3, 0x5, builder.prototype.appendString, 'en-US', // Incoming Locales
                0x40, 0x40, 0xc1, 0x1, 0x0 // Capabilities & properties
            ]);
            var bufb = new builder();
            codec.encode(performative, bufb);
            tu.shouldBufEql(expected, bufb);
        });
    });
});
