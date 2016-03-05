'use strict';

var expect = require('chai').expect,
    builder = require('buffer-builder'),
    BufferBuilder = require('buffer-builder'),
    Int64 = require('node-int64'),

    codec = require('../../lib/codec'),
    ForcedType = require('../../lib/types/forced_type'),
    AMQPArray = require('../../lib/types/amqp_composites').Array,

    errors = require('../../lib/errors'),
    tu = require('./../testing_utils');

var buf = tu.buildBuffer;

describe('Types', function() {
  describe('#encoding', function() {
    function testEncoding(test) {
      it(test.name, function() {
        var type = test.type || test.name;
        var buffer = new BufferBuilder();
        codec.encode(new ForcedType(type, test.value), buffer);
        tu.shouldBufEql(test.expectedOutput, buffer.get());
      });
    }

    describe('errors', function() {
      ['decimal32', 'decimal64', 'decimal128'].forEach(function(typeName) {
        it('should error on unsupported type: ' + typeName, function() {
          var buffer = new BufferBuilder();
          var type = new ForcedType(typeName, 'some data');
          expect(function() { codec.encode(type, buffer); }).to.throw(errors.NotImplementedError);
        });
      });

      it('should throw an EncodingError for invalid ForcedTypes', function() {
        var invalidType = new ForcedType('bazookas', 'hello world');
        var invalid = function() { codec.encode(invalidType, new BufferBuilder()); };
        expect(invalid).to.throw(errors.EncodingError);
        expect(invalid).to.throw(/unknown type/);
      });
    });

    describe('primitives', function() {
      describe('scalar', function() {
        describe('errors', function() {
          // it('should error encoding ulongs greater than 2^32 - 1', function() {
          //   var buffer = new BufferBuilder();
          //   var type = new ForcedType('ulong', 4294967295);
          //   expect(function() { codec.encode(type, buffer); }).to.throw(errors.NotImplementedError);
          // });

          it('should error encoding ulongs of invalid type', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('ulong', 'giraffes');
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });


          // it('should error encoding longs greater than 2^32 - 1', function() {
          //   var buffer = new BufferBuilder();
          //   var type = new ForcedType('long', 4294967295);
          //   expect(function() { codec.encode(type, buffer); }).to.throw(errors.NotImplementedError);
          // });

          it('should error encoding longs of invalid type', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('long', 'elephants');
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });

          // NOTE: We now allow users to specify up to 2^53, and silently drop precision otherwise.
          //       This test should perhaps be reenabled to verify that a warning is shown if/when
          //       a user is using a number that will lose precision over the wire.
          // it('should error encoding timestamps greater than 2^32 - 1', function() {
          //   var buffer = new BufferBuilder();
          //   var type = new ForcedType('timestamp', 4294967295);
          //   expect(function() { codec.encode(type, buffer); }).to.throw(errors.NotImplementedError);
          // });

          it('should error encoding timestamps of invalid type', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('timestamp', 'turtles');
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });

        });

        it('should encode/decode the same as node-int64', function() {
          var tests = [
            { type: 'long', code: 0x81, value: 5000 },
            { type: 'ulong', code: 0x80, value: 5000 }
          ];

          tests.forEach(function(test) {
            var buffer = new BufferBuilder();
            codec.encode(new ForcedType(test.type, test.value), buffer);
            var int64 = new Int64(buffer.get().slice(1));
            expect(int64.toNumber()).to.equal(test.value);
            var fromInt64Buffer = Buffer.concat([new Buffer([test.code]), int64.toBuffer()]);
            var fromInt64 = codec.decode(fromInt64Buffer);
            expect(fromInt64[0]).to.equal(test.value);
          });
        });

        var vbin32Buffer = [];
        var str32Utf8String;
        var sym32String;
        for (var i = 0; i < 500; ++i) {
          str32Utf8String += 'f';
          sym32String += 'a';
          vbin32Buffer.push(0x01);
        }

        var str32Utf8StringExpectedBuffer = [
          0xb1,
          builder.prototype.appendUInt32BE, str32Utf8String.length,
          builder.prototype.appendString, str32Utf8String
        ];

        var sym32StringExpectedBuffer = [
          0xb3,
          builder.prototype.appendUInt32BE, sym32String.length,
          builder.prototype.appendString, sym32String
        ];

        var vbin32ExpectedBuffer = [
          0xb0,
          builder.prototype.appendUInt32BE, 500,
        ].concat(vbin32Buffer);

        [
          { name: 'null', value: null, expectedOutput: buf([0x40]) },
          { name: 'true', type: 'boolean', value: true, expectedOutput: buf([0x41]) },
          { name: 'true (by code)', type: 0x41, value: true, expectedOutput: buf([]) },
          { name: 'false', type: 'boolean', value: false, expectedOutput: buf([0x42]) },
          { name: 'false (by code)', type: 0x42, value: false, expectedOutput: buf([]) },
          { name: 'boolean (truth by code)', type: 0x56, value: true, expectedOutput: buf([0x01]) },
          { name: 'boolean (false by code)', type: 0x56, value: false, expectedOutput: buf([0x00]) },
          { name: 'ubyte', value: 1, expectedOutput: buf([0x50, 0x01]) },
          { name: 'ushort', value: 1, expectedOutput: buf([0x60, 0x00, 0x01]) },

          {
            name: 'uint', value: 20000,
            expectedOutput: buf([0x70, builder.prototype.appendInt32BE, 20000])
          },
          { name: 'smalluint', type: 'uint', value: 1, expectedOutput: buf([0x52, 0x01]) },
          { name: 'uint0', type: 'uint', value: 0, expectedOutput: buf([0x43]) },

          {
            name: 'ulong',
            value: 256,
            expectedOutput: buf([0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00])
          },
          {
            name: 'ulong (largest in js)', type: 'ulong',
            value: (Math.pow(2, 53) - 1),
            expectedOutput: buf([0x80, 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
          },
          {
            name: 'ulong (int64)', type: 'ulong',
            value: new Int64(0x11111111, 0x11111111),
            expectedOutput: buf([0x80, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11])
          },
          {
            name: 'smallulong', type: 'ulong',
            value: 127,
            expectedOutput: buf([0x53, 0x7f])
          },
          {
            name: 'smallulong (int64)', type: 'ulong',
            value: new Int64(0x00000000, 0x00000001),
            expectedOutput: buf([0x53, 0x01])
          },
          {
            name: 'ulong0 (int64)', type: 'ulong',
            value: new Int64(0x00000000, 0x00000000),
            expectedOutput: buf([0x44])
          },
          {
            name: 'ulong0', type: 'ulong',
            value: 0,
            expectedOutput: buf([0x44])
          },
          { name: 'byte', value: 1, expectedOutput: buf([0x51, 0x01]) },
          { name: 'short', value: 1, expectedOutput: buf([0x61, 0x00, 0x01]) },
          { name: 'int', value: 129, expectedOutput: buf([0x71, 0x00, 0x00, 0x00, 0x81]) },
          { name: 'smallint', type: 'int', value: 1, expectedOutput: buf([0x54, 0x01]) },
          {
            name: 'long', value: 129,
            expectedOutput: buf([0x81, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x81])
          },
          {
            name: 'long (largest in js)', type: 'long',
            value: (Math.pow(2, 53) - 1),
            expectedOutput: buf([0x81, 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
          },
          {
            name: 'long (smallest in js)', type: 'long',
            value: -(Math.pow(2, 53) - 1),
            expectedOutput: buf([0x81, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])
          },
          {
            name: 'long (int64)', type: 'long',
            value: new Int64(0x11111111, 0x11111111),
            expectedOutput: buf([0x81, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11])
          },
          { name: 'smalllong', type: 'long', value: 127, expectedOutput: buf([0x55, 0x7f]) },
          {
            name: 'smalllong (int64)', type: 'long',
            value: new Int64(127),
            expectedOutput: buf([0x55, 0x7f])
          },
          {
            name: 'float',
            value: 3.14,
            expectedOutput: buf([0x72, builder.prototype.appendFloatBE, 3.14])
          },
          {
            name: 'double', value: 123.45,
            expectedOutput: buf([0x82, builder.prototype.appendDoubleBE, 123.45])
          },
          // { name: 'decimal32', type: 0x74, value: buf([0x00, 0x01, 0x00, 0x01]), expectedOutput: 1.1 },
          // {
          //   name: 'decimal64', type: 0x84,
          //   value: buf([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01]),
          //   expectedOutput: 1.1
          // },
          // {
          //   name: 'decimal128', type: 0x94,
          //   value: buf([
          //     0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
          //     0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01
          //   ]),
          //   expectedOutput: 1.1
          // },
          { name: 'utf32 (char)', type: 0x73, value: 'A',
            expectedOutput: buf([0x73, 0x00, 0x00, 0x00, 0x41])
          },
          {
            name: 'uuid', type: 0x98,
            value: '797ff043-11eb-11e1-80d6-510998755d10',
            expectedOutput: buf([
              0x79, 0x7f, 0xf0, 0x43, 0x11, 0xeb, 0x11, 0xe1,
              0x80, 0xd6, 0x51, 0x09, 0x98, 0x75, 0x5d, 0x10
            ])
          },
          {
            name: 'ms64 (timestamp int64)', type: 'timestamp',
            value: new Int64(1427143480),
            expectedOutput: buf([0x83, 0x00, 0x00, 0x00, 0x00, 0x55, 0x10, 0x7B, 0x38])
          },
          {
            name: 'ms64 (timestamp Number)', type: 'timestamp',
            value: 1427143480,
            expectedOutput: buf([0x83, 0x00, 0x00, 0x00, 0x00, 0x55, 0x10, 0x7B, 0x38])
          },
          {
            name: 'ms64 (timestamp Date)', type: 'timestamp',
            value: new Date(1427143480),
            expectedOutput: buf([0x83, 0x00, 0x00, 0x00, 0x00, 0x55, 0x10, 0x7B, 0x38])
          },
          {
            name: 'vbin8', type: 'binary',
            value: new Buffer([0x10]),
            expectedOutput: buf([0xa0, 0x01, 0x10])
          },
          {
            name: 'vbin32', type: 'binary',
            value: new Buffer(vbin32Buffer),
            expectedOutput: buf(vbin32ExpectedBuffer)
          },
          {
            name: 'str8-utf8', type: 'string',
            value: 'foo',
            expectedOutput: buf([0xa1, 3, builder.prototype.appendString, 'foo'])
          },
          {
            name: 'str8-utf8 (empty)', type: 'string',
            value: '',
            expectedOutput: buf([0xa1, 0])
          },
          {
            name: 'str32-utf8', type: 'string', value: str32Utf8String,
            expectedOutput: buf(str32Utf8StringExpectedBuffer)
          },
          {
            name: 'sym8', type: 'symbol', value: 'foo',
            expectedOutput: buf([0xa3, 3, builder.prototype.appendString, 'foo'])
          },
          {
            name: 'sym8 (empty)', type: 'symbol',
            value: '',
            expectedOutput: buf([0xa3, 0]) },
          {
            name: 'sym32', type: 'symbol',
            value: sym32String,
            expectedOutput: buf(sym32StringExpectedBuffer)
          }
        ].forEach(testEncoding);
      });

      describe('collection', function() {
        describe('errors', function() {
          it('should error trying to build an array of non AMQPArray', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('array', []);
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });

          it('should error trying to build an AMQPArray with invalid types', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('array', new AMQPArray('invalidType', []));
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });

          it('should error trying to build a list with non arrays', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('list', {});
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });

          it('should error trying to build a map with non object', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('map', 'dogs');
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });

          it('should error trying to build a map from an array', function() {
            var buffer = new BufferBuilder();
            var type = new ForcedType('map', ['dogs']);
            expect(function() { codec.encode(type, buffer); }).to.throw(errors.EncodingError);
          });
        });

        var array32 = [];
        var array32Buffer = [];
        var list32Buffer = [];
        var map32 = {};
        var map32Buffer = [];
        for (var i = 0; i < 256; ++i) {
          array32.push(1);
          array32Buffer.push(0x01);

          list32Buffer.push(0x52);
          list32Buffer.push(0x01);

          var key = 'elt' + (100 +i);
          map32[key] = 456;
          map32Buffer = map32Buffer.concat([
            0xa1, 0x06, builder.prototype.appendString, key,
            0x70, builder.prototype.appendInt32BE, 456,
          ]);
        }

        var array32ExpectedBuffer = [
          0xF0,
          builder.prototype.appendUInt32BE, 261, builder.prototype.appendUInt32BE, 256,
          0x54
        ].concat(array32Buffer);

        var list32 = array32;
        var list32ExpectedBuffer = [
          0xd0,
          builder.prototype.appendUInt32BE, 516, builder.prototype.appendUInt32BE, 256,
        ].concat(list32Buffer);

        var map32ExpectedBuffer = [
          0xd1,
          builder.prototype.appendUInt32BE, 3332, builder.prototype.appendUInt32BE, 512,
        ].concat(map32Buffer);

        [
          { name: 'array8 (empty)', type: 'array', value: new AMQPArray([], 0x54), expectedOutput: buf([0x40]) },
          {
            name: 'array8', type: 'array',
            value: new AMQPArray([1, 2, 3], 0x54),
            expectedOutput: buf([0xe0, 0x05, 0x03, 0x54, 0x01, 0x02, 0x03])
          },
          {
            name: 'array8 (by code)', type: 0xe0,
            value: new AMQPArray([1, 2, 3], 0x54),
            expectedOutput: buf([0x05, 0x03, 0x54, 0x01, 0x02, 0x03])
          },
          {
            name: 'array8 (of lists)', type: 'array',
            value: new AMQPArray([ [1,2,3], [1,2,3] ], 0xc0),
            expectedOutput: buf([
              0xe0,
              0x12, 0x02,
              0xc0,
                0x07, 0x03, 0x52, 0x01, 0x52, 0x02, 0x52, 0x03,
                0x07, 0x03, 0x52, 0x01, 0x52, 0x02, 0x52, 0x03])
          },
          {
            name: 'array8 (of maps)', type: 'array',
            value: new AMQPArray([ { hello: 'world' }, { goodnight: 'moon'} ], 0xc1),
            expectedOutput: buf([
              0xe0,
              0x25, 0x02,
              0xc1, 0x0f, 0x02,
                0xa1, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0xa1, 0x05, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x12, 0x02,
                0xa1, 0x09, 0x67, 0x6f, 0x6f, 0x64, 0x6e, 0x69, 0x67, 0x68, 0x74, 0xa1, 0x04, 0x6d, 0x6f, 0x6f, 0x6e
            ])
          },
          {
            name: 'array32', type: 'array',
            value: new AMQPArray(array32, 0x54),
            expectedOutput: array32ExpectedBuffer
          },
          {
            name: 'array32 (by code)', type: 0xf0,
            value: new AMQPArray(array32, 0x54),
            expectedOutput: array32ExpectedBuffer.slice(1, array32ExpectedBuffer.length)
          },
          { name: 'list (empty)', type: 'list', value: [], expectedOutput: buf([0x45]) },
          { name: 'list (empty by code)', type: 0x45, value: [], expectedOutput: buf([]) },
          {
            name: 'list8', type: 'list',
            value: [456, 789],
            expectedOutput: buf([
              0xc0, 0xb, 0x2,
              0x70, builder.prototype.appendInt32BE, 456,
              0x70, builder.prototype.appendInt32BE, 789
            ])
          },
          {
            name: 'list8 (by code)', type: 0xc0,
            value: [456, 789],
            expectedOutput: buf([
              0xB, 0x2,
              0x70, builder.prototype.appendInt32BE, 456,
              0x70, builder.prototype.appendInt32BE, 789
            ])
          },
          { name: 'list32', type: 'list', value: list32, expectedOutput: list32ExpectedBuffer },
          {
            name: 'list32 (by code)', type: 0xd0, value: list32,
            expectedOutput: list32ExpectedBuffer.slice(1, list32ExpectedBuffer.length)
          },
          { name: 'map8 (empty)', type: 'map', value: {}, expectedOutput: buf([0xc1, 0x1, 0x0]) },
          {
            name: 'map8', type: 'map',
            value: { foo: 456, bar: 45.6 },
            expectedOutput: buf([
              0xc1, 0x19, 0x04,
              0xa1, 0x03, builder.prototype.appendString, 'foo',
              0x70, builder.prototype.appendInt32BE, 456,
              0xa1, 0x03, builder.prototype.appendString, 'bar',
              0x82, builder.prototype.appendDoubleBE, 45.6
            ])
          },
          {
            name: 'map8 (by code)', type: 0xc1,
            value: { foo: 456, bar: 45.6 },
            expectedOutput: buf([
              0x19, 0x04,
              0xa1, 0x03, builder.prototype.appendString, 'foo',
              0x70, builder.prototype.appendInt32BE, 456,
              0xa1, 0x03, builder.prototype.appendString, 'bar',
              0x82, builder.prototype.appendDoubleBE, 45.6
            ])
          },
          {
            name: 'map8 (nested)', type: 'map', value: { baz: { zap: 'bop' } },
            expectedOutput: buf([
              0xC1,
              0x13, 0x02,
              0xA1, 0x03, builder.prototype.appendString, 'baz',
              0xC1,
              0x0b, 0x02,
              0xA1, 0x03, builder.prototype.appendString, 'zap',
              0xA1, 0x03, builder.prototype.appendString, 'bop'
            ])
          },
          { name: 'map32', type: 'map', value: map32, expectedOutput: map32ExpectedBuffer },
          {
            name: 'map32 (by code)', type: 0xD1, value: map32,
            expectedOutput: map32ExpectedBuffer.slice(1, map32ExpectedBuffer.length)
          }

        ].forEach(testEncoding);
      });
    });
  });

  describe('#decoding', function() {
    function testDecoding(test) {
      it(test.name, function() {
        var actualOutput = codec.decode(test.value)[0];
        if (typeof test.expectedOutput === 'number' && test.expectedOutput % 1 !== 0) {
          expect(actualOutput).to.be.closeTo(test.expectedOutput, 0.00001);
        } else {
          expect(actualOutput).to.eql(test.expectedOutput);
        }
      });
    }

    describe('errors', function() {
      [
        { name: 'decimal32', value: buf([0x74, 0x00, 0x00, 0x00, 0x00]) },
        { name: 'decimal64', value: buf([0x84, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]) },
        { name: 'decimal128' , value: buf([0x94, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]) }
      ].forEach(function(type) {
        it('should error on unsupported type: ' + type.name, function() {
          expect(function() { codec.decode(type.value, 0); }).to.throw(errors.NotImplementedError);
        });
      });
    });

    describe('primitives', function() {
      describe('scalar', function() {
        [
          { name: 'null', value: buf([0x40]), expectedOutput: null },
          { name: 'true', value: buf([0x41]), expectedOutput: true },
          { name: 'false', value: buf([0x42]), expectedOutput: false },
          { name: 'boolean(true)', value: buf([0x56, 0x01]), expectedOutput: true },
          { name: 'boolean(false)', value: buf([0x56, 0x00]), expectedOutput: false },
          { name: 'ubyte', value: buf([0x50, 0x01]), expectedOutput: 1 },
          { name: 'ushort', value: buf([0x60, 0x00, 0x01]), expectedOutput: 1 },
          {
            name: 'uint',
            value: buf([0x70, builder.prototype.appendInt32BE, 123]),
            expectedOutput: 123
          },
          { name: 'smalluint', value: buf([0x52, 0x01]), expectedOutput: 1 },
          { name: 'uint0', value: buf([0x43]), expectedOutput: 0 },

          {
            name: 'ulong-not-int64',
            value: buf([0x80, 0x00, 0x00, 0x00, 0x00, 0x80, 0x10, 0x00, 0x00]),
            expectedOutput: 2148532224
          },
          {
            name: 'ulong',
            value: buf([0x80, 0x01, 0x01, 0x01, 0x01, 0x23, 0x45, 0x67, 0x89]),
            expectedOutput: new Int64(0x01010101, 0x23456789)
          },
          {
            name: 'ulong (largest in js)',
            value: buf([0x80, 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
            expectedOutput: (Math.pow(2, 53) - 1)
          },
          {
            name: 'smallulong', value: buf([0x53, 0x01]),
            expectedOutput: 0x01
          },
          {
            name: 'ulong0',
            value: buf([0x44]),
            expectedOutput: 0
          },
          { name: 'byte', value: buf([0x51, 0x01]), expectedOutput: 1 },
          { name: 'short', value: buf([0x61, 0x00, 0x01]), expectedOutput: 1 },
          { name: 'int', value: buf([0x71, 0x00, 0x00, 0x00, 0x01]), expectedOutput: 1 },
          { name: 'smallint', value: buf([0x54, 0x01]), expectedOutput: 1 },
          {
            name: 'long-not-int64',
            value: buf([0x81, 0x00, 0x00, 0x00, 0x00, 0x80, 0x10, 0x00, 0x00]),
            expectedOutput: 2148532224
          },
          {
            name: 'long',
            value: buf([0x81, 0x01, 0x01, 0x01, 0x01, 0x23, 0x45, 0x67, 0x89]),
            expectedOutput: new Int64(0x01010101, 0x23456789)
          },
          {
            name: 'long (largest in js)',
            value: buf([0x81, 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
            expectedOutput: (Math.pow(2, 53) - 1)
          },
          {
            name: 'long (smallest in js)',
            value: buf([0x81, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]),
            expectedOutput: -(Math.pow(2, 53) - 1)
          },
          { name: 'smalllong', value: buf([0x55, 0x23]), expectedOutput: 0x23 },
          {
            name: 'float',
            value: buf([0x72, builder.prototype.appendFloatBE, 3.14]),
            expectedOutput: 3.14
          },
          {
            name: 'double',
            value: buf([0x82, builder.prototype.appendDoubleBE, 123.45]),
            expectedOutput: 123.45
          },
          // { name: 'decimal32', type: 0x74, value: buf([0x00, 0x01, 0x00, 0x01]), expectedOutput: 1.1 },
          // {
          //   name: 'decimal64', type: 0x84,
          //   value: buf([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01]),
          //   expectedOutput: 1.1
          // },
          // {
          //   name: 'decimal128', type: 0x94,
          //   value: buf([
          //     0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
          //     0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01
          //   ]),
          //   expectedOutput: 1.1
          // },
          { name: 'utf32 (char)', value: buf([0x73, 0x00, 0x00, 0x00, 0x41]), expectedOutput: 'A' },
          {
            name: 'uuid',
            value: buf([
              0x98,
              0x79, 0x7f, 0xf0, 0x43, 0x11, 0xeb, 0x11, 0xe1,
              0x80, 0xd6, 0x51, 0x09, 0x98, 0x75, 0x5d, 0x10
            ]),
            expectedOutput: '797ff043-11eb-11e1-80d6-510998755d10'
          },

          // @todo: reenable this when we figure out how to optionally enable Int64 with timestamps
          // {
          //   name: 'ms64 (timestamp)',
          //   value: buf([0x83, 0x00, 0x00, 0x00, 0x00, 0x55, 0x10, 0x7B, 0x38]),
          //   expectedOutput: new Int64(1427143480)
          // },
          {
            name: 'ms64 (timestamp)',
            value: buf([0x83, 0x00, 0x00, 0x00, 0x00, 0x55, 0x10, 0x7B, 0x38]),
            expectedOutput: new Date(1427143480)
          },
          { name: 'vbin8', value: buf([0xa0, 0x01, 0x10]), expectedOutput: new Buffer([0x10]) },
          {
            name: 'vbin32',
            value: buf([
              0xb0,
              builder.prototype.appendUInt32BE, 0x04,
              0x01, 0x02, 0x03, 0x04
            ]),
            expectedOutput: new Buffer([0x01, 0x02, 0x03, 0x04]) },

          {
            name: 'str8-utf8',
            value: buf([0xa1, 3, builder.prototype.appendString, 'foo']),
            expectedOutput: 'foo'
          },
          { name: 'str8-utf8 (empty)', value: buf([0xa1, 0]), expectedOutput: '' },
          {
            name: 'str32-utf8',
            value: buf([0xb1, builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo']),
            expectedOutput: 'foo'
          },
          {
            name: 'str32-utf8 (empty)',
            value: buf([0xb1, builder.prototype.appendUInt32BE, 0, builder.prototype.appendString, '']),
            expectedOutput: ''
          },
          {
            name: 'sym8',
            value: buf([0xa3, 3, builder.prototype.appendString, 'foo']),
            expectedOutput: 'foo'
          },
          { name: 'sym8 (empty)', value: buf([0xa3, 0]), expectedOutput: '' },
          {
            name: 'sym32',
            value: buf([0xb3, builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo']),
            expectedOutput: 'foo'
          },
        ].forEach(testDecoding);
      });

      describe('collection', function() {
        describe('errors', function() {
          it('should error trying to decode an array with invalid types', function() {
            var data = buf([
              0xE0,
              (10 + 1 + 1), 2, 0xf1,
              4, builder.prototype.appendString, 'elt1',
              4, builder.prototype.appendString, 'elt2',
            ]);

            expect(function() { codec.decode(data); }).to.throw(errors.MalformedPayloadError);
          });

          it('should error trying to decode an array with non uniform types', function() {
            var data = buf([
              0xE0,
              (10 + 1 + 1), 2, 0xA1,
              4, builder.prototype.appendString, 'elt1',
              0x71, builder.prototype.appendInt32BE, 456
            ]);

            expect(function() { codec.decode(data); }).to.throw(errors.MalformedPayloadError);
          });
        });

        [
          { name: 'list0', value: buf([0x45]), expectedOutput: [] },
          {
            name: 'list8',
            value: buf([
              0xC0,
              0xB, 0x2,
              0x71, builder.prototype.appendInt32BE, 123,
              0x71, builder.prototype.appendInt32BE, 456
            ]),
            expectedOutput: [123, 456]
          },
          {
            name: 'list32',
            value: buf([
              0xD0,
              builder.prototype.appendUInt32BE, 0xE, builder.prototype.appendUInt32BE, 0x2,
              0x71, builder.prototype.appendInt32BE, 123,
              0x71, builder.prototype.appendInt32BE, 456
            ]),
            expectedOutput: [123, 456]
          },
          {
            name: 'array8',
            value: buf([
              0xE0,
              (10 + 1 + 1), 2, 0xA1,
              4, builder.prototype.appendString, 'elt1',
              4, builder.prototype.appendString, 'elt2'
            ]),
            expectedOutput: ['elt1', 'elt2']
          },
          {
            name: 'array32',
            value: buf([
              0xF0,
              builder.prototype.appendUInt32BE, (10 + 4 + 1),
              builder.prototype.appendUInt32BE, 2,
              0xA1,
              4, builder.prototype.appendString, 'elt1',
              4, builder.prototype.appendString, 'elt2'
            ]),
            expectedOutput: ['elt1', 'elt2']
          },
          { name: 'map8 (empty)', value: buf([0xc1, 0x1, 0x0]), expectedOutput: {} },
          {
            name: 'map8',
            value: buf([
              0xc1,
              0x19, 0x04,
              0xA1, 0x03, builder.prototype.appendString, 'foo',
              0x71, builder.prototype.appendInt32BE, 456,
              0xA1, 0x03, builder.prototype.appendString, 'bar',
              0x82, builder.prototype.appendDoubleBE, 45.6
            ]),
            expectedOutput: { foo: 456, bar: 45.6 }
          },
          {
            name: 'map32',
            value: buf([
              0xd1,
              builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x02,
              0xA1, 0x03, builder.prototype.appendString, 'baz',
              0xD1, builder.prototype.appendUInt32BE, 0x0e, builder.prototype.appendUInt32BE, 0x02,
              0xA1, 0x03, builder.prototype.appendString, 'zap',
              0xA1, 0x03, builder.prototype.appendString, 'bop'
            ]),
            expectedOutput: { baz: { zap: 'bop' } }
          }
        ].forEach(testDecoding);
      });
    });
  });
});
