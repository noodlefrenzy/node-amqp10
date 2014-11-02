var assert      = require('assert'),
    should      = require('should'),
    debug       = require('debug')('amqp10-test-types'),
    builder     = require('buffer-builder'),
    Int64       = require('node-int64'),

    types       = require('../lib/types'),
    codec       = require('../lib/codec'),

    tu          = require('./testing_utils');

var buf = tu.newBuf;

function assertEncoders(tests, maxSize) {
    for (var idx in tests) {
        var curTest = tests[idx];
        try {
            var enc = types.builders[curTest[0]];
            (enc === undefined).should.be.false;
            (typeof enc).should.eql('function');
            var actual = new builder();
            enc(curTest[1], actual, codec);
            actual = actual.get();
            debug('Encoded "' + curTest[0] + '" => 0x' + actual.toString('hex'));
            actual.toString('hex').should.eql(curTest[2].toString('hex'), idx + ': ' + curTest[0] + ' encoding failed');
        } catch (e) {
            if (e instanceof assert.AssertionError) {
                throw e;
            } else {
                throw new assert.AssertionError({ message: 'Failed with '+ e.message +' while testing encoding of '+JSON.stringify(curTest[1]) });
            }
        }
    }
}

function assertDecoders(tests) {
    for (var idx in tests) {
        var curTest = tests[idx];
        try {
            var dec = types.decoders[curTest[0]];
            (dec === undefined).should.be.false;
            (typeof dec).should.eql('function');
            var actual = dec(curTest[1], codec);
            debug('Decoded 0x'+curTest[1].toString('hex')+' => '+JSON.stringify(actual));
            if (curTest[3]) {
                curTest[3](actual, curTest[2]).should.be.true;
            } else {
                actual.should.eql(curTest[2], idx + ': decoding failed');
            }
        } catch (e) {
            if (e instanceof assert.AssertionError) {
                throw e;
            } else {
                throw new assert.AssertionError({ message: 'Failed with '+ e.message +' while testing decoding of '+curTest[1].toString('hex') });
            }
        }
    }
}

describe('Types', function() {
    describe('#getCode()', function() {
        it('should special-case null', function() {
            types.getCode(null).should.eql(0x40);
        });

        it('should cope with specific forced-types', function() {
            types.getCode('foo', 0xA3).should.eql(0xA3);
            types.getCode(0, 0x80).should.eql(0x80);
        });

        it('should cope with general forced-types', function() {
            types.getCode('foo', 'symbol').should.eql(0xA3);
            types.getCode(0, 'ulong').should.eql(0x44); // Special zero-val
        });

        it('should cope with booleans', function() {
            types.getCode(true).should.eql(0x41);
            types.getCode(false).should.eql(0x42);
        });

        it('should fallthrough to most compressed type', function() {
            types.getCode(0).should.eql(0x43);
            types.getCode(123).should.eql(0x50);
            types.getCode(-123).should.eql(0x51);
            types.getCode(300).should.eql(0x60);
            types.getCode(-300).should.eql(0x61);
        });

        it('should fallthrough to most compressed type even with forced', function() {
            types.getCode(0, 'ulong').should.eql(0x44);
            types.getCode(123, 'ulong').should.eql(0x53);
            types.getCode(300, 'ulong').should.eql(0x80);
            // @todo Width should be cognizant of forced type.
            //types.getCode(130, 'int').should.eql(0x71);
        });

        it('should cope with Int64 values', function() {
            types.getCode(new Int64(0x0F, 0x0F)).should.eql(0x81);
        });

        it('should cope with lists', function() {
            types.getCode([123, 'foo']).should.eql(0xD0);
        });

        it('should cope with arrays', function() {
            types.getCode([]).should.eql(0x40);
            types.getCode([123, 456]).should.eql(0xF0);
        });

        it('should cope with maps', function() {
            types.getCode({ k1: 'v1', k2: 'v2' }).should.eql(0xD1);
        });
    });

    describe('#encoders', function() {
        it('should encode basic primitives', function() {
            var toTest = [
                [ 'null', null, buf([0x40]) ],
                [ 'boolean', true, buf([0x41]) ],
                [ 'boolean', false, buf([0x42]) ],
                [ 'uint', 10000, buf([0x70, builder.prototype.appendUInt32BE, 10000]) ],
                [ 'uint', 100, buf([0x52, builder.prototype.appendUInt8, 100]) ],
                [ 'uint', 0, buf([0x43]) ],
                [ 'int', -10000, buf([0x71, builder.prototype.appendInt32BE, -10000]) ],
                [ 'double', 123.45, buf([0x82, builder.prototype.appendDoubleBE, 123.45]) ],
                [ 'long', new Int64(0xFFFFFFFF, 0xFFFFFFFF), buf([0x81, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]) ]
            ];

            assertEncoders(toTest);
        });

        it('should encode variable primitives', function() {
            var toTest = [
                [ 'string', 'foo', buf([0xA1, 0x03, builder.prototype.appendString, 'foo']) ]
            ];

            assertEncoders(toTest);
        });

        it('should encode lists', function() {
            var toTest = [
                [ 'list', [], buf([0x45]) ],
                [ 'list', [ 123, 456 ], buf([0xC0, 0xB, 0x2, 0x71, builder.prototype.appendInt32BE, 123, 0x71, builder.prototype.appendInt32BE, 456]) ]
            ];

            assertEncoders(toTest);
        });

        it('should encode maps', function() {
            var toTest = [ ['map', {}, buf([0x40]) ],
             [ 'map', { foo: 123, bar: 45.6 }, buf([0xD1,
                 builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x04,
                 0xA1, 0x03, builder.prototype.appendString, 'foo',
                 0x71, builder.prototype.appendInt32BE, 123,
                 0xA1, 0x03, builder.prototype.appendString, 'bar',
                 0x82, builder.prototype.appendDoubleBE, 45.6]) ],
             [ 'map',
               {
                 baz: { zap: 'bop' }
               },
               buf([0xD1,
                   builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x02,
                   0xA1, 0x03, builder.prototype.appendString, 'baz',
                   0xD1, builder.prototype.appendUInt32BE, 0x0e, builder.prototype.appendUInt32BE, 0x02,
                         0xA1, 0x03, builder.prototype.appendString, 'zap',
                         0xA1, 0x03, builder.prototype.appendString, 'bop'
               ])
             ]
            ];
            debugger;
            assertEncoders(toTest);
        });
    });

    describe('#decoders()', function() {
        it('should decode basic primitives', function() {
            var toTest = [
                [ 0x40, new Buffer([]), null, function(a,b) { return a === b; } ],
                [ 0x41, new Buffer([]), true ],
                [ 0x42, new Buffer([]), false ],
                [ 0x56, buf([0x01]), true ],
                [ 0x70, buf([builder.prototype.appendInt32BE, 123]), 123 ],
                [ 0x82, buf([builder.prototype.appendDoubleBE, 123.45]), 123.45 ],
                [ 0x55, buf([0x23]), 0x23 ],
                [ 0x81, buf([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), new Int64(0xFFFFFFFF, 0xFFFFFFFF),
                    function(a,b) { return (a instanceof Int64) && a.toOctetString() == b.toOctetString(); }]
            ];

            assertDecoders(toTest);
        });

        it('should decode variable primitives', function() {
            var toTest = [
                [ 0xa1, buf([3, builder.prototype.appendString, 'foo' ]), 'foo' ],
                [ 0xb1, buf([builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo' ]), 'foo' ],
                [ 0xa3, buf([3, builder.prototype.appendString, 'foo' ]), 'foo' ],
                [ 0xb3, buf([builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo' ]), 'foo' ]
            ];

            assertDecoders(toTest);
        });

        it('should decode lists', function() {
            var toTest = [
                [ 0x45, new Buffer([]), [] ],
                [ 0xC0, buf([0xB, 0x2, 0x71, builder.prototype.appendInt32BE, 123, 0x71, builder.prototype.appendInt32BE, 456]), [ 123, 456 ] ]
            ];

            assertDecoders(toTest);
        });

        it('should decode maps', function() {
            var toTest = [
                [ 0xD1,
                    buf([builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x02,
                        0xA1, 0x03, builder.prototype.appendString, 'baz',
                        0xD1, builder.prototype.appendUInt32BE, 0x0e, builder.prototype.appendUInt32BE, 0x02,
                        0xA1, 0x03, builder.prototype.appendString, 'zap',
                        0xA1, 0x03, builder.prototype.appendString, 'bop'
                    ]),
                    {
                        baz: { zap: 'bop' }
                    }
                ],
                [ 0xD1,
                    buf([
                        builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x04,
                        0xA1, 0x03, builder.prototype.appendString, 'foo',
                        0x71, builder.prototype.appendInt32BE, 123,
                        0xA1, 0x03, builder.prototype.appendString, 'bar',
                        0x82, builder.prototype.appendDoubleBE, 45.6]),
                    { foo: 123, bar: 45.6 }
                ]
            ];
            assertDecoders(toTest);
        });
    });
});