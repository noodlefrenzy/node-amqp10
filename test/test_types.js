'use strict';

var assert = require('assert'),
    should = require('should'),
    debug = require('debug')('amqp10-test-types'),
    expect = require('chai').expect,
    builder = require('buffer-builder'),
    BufferBuilder = require('buffer-builder'),
    Int64 = require('node-int64'),

    types = require('../lib/types'),
    codec = require('../lib/codec'),
    ForcedType = require('../lib/types/forced_type'),

    AMQPSymbol = require('../lib/types/amqp_symbol'),

    tu = require('./testing_utils');

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

    describe('primitives', function() {
      describe('scalar', function() {
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
          { name: 'false', type: 'boolean', value: false, expectedOutput: buf([0x42]) },
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
            name: 'ulong0', type: 'ulong',
            value: new Int64(0x00000000, 0x00000000),
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
          // { name: 'utf32 (char)', type: 0x73, value: buf([0x24]), expectedOutput: '$' },
          // {
          //   name: 'ms64 (timestamp)', type: 0x83,
          //   value: buf([0x00, 0x00, 0x00, 0x00, 0x55, 0x10, 0x7B, 0x38]),
          //   expectedOutput: new Date(1427143480)
          // },
          // {
          //   name: 'uuid', type: 0x98,
          //   value: buf([
          //     0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
          //     0x09, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16
          //   ]),
          //   expectedOutput: 'some uuid'
          // },
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
            name: 'sym8', type: 'symbol', value: new AMQPSymbol('foo'),
            expectedOutput: buf([0xa3, 3, builder.prototype.appendString, 'foo'])
          },
          {
            name: 'sym8 (empty)', type: 'symbol',
            value: new AMQPSymbol(''),
            expectedOutput: buf([0xa3, 0]) },
          {
            name: 'sym32', type: 'symbol',
            value: new AMQPSymbol(sym32String),
            expectedOutput: buf(sym32StringExpectedBuffer)
          }
        ].forEach(testEncoding);
      });

      describe('collection', function() {
        [
          { name: 'list(empty)', type: 'list', value: [], expectedOutput: buf([0x45]) },
          {
            name: 'list', value: [456, 789],
            expectedOutput: buf([
              0xC0,
              0xB, 0x2,
              0x71, builder.prototype.appendInt32BE, 456,
              0x71, builder.prototype.appendInt32BE, 789
            ])
          },
          { name: 'map(empty)', type: 'map', value: {}, expectedOutput: buf([0xc1, 0x1, 0x0]) },
          {
            name: 'map', value: { foo: 456, bar: 45.6 },
            expectedOutput: buf([
              0xD1,
              builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x04,
              0xA1, 0x03, builder.prototype.appendString, 'foo',
              0x71, builder.prototype.appendInt32BE, 456,
              0xA1, 0x03, builder.prototype.appendString, 'bar',
              0x82, builder.prototype.appendDoubleBE, 45.6
            ])
          },
          {
            name: 'map(nested)', type: 'map', value: { baz: { zap: 'bop' } },
            expectedOutput: buf([
              0xD1,
              builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x02,
              0xA1, 0x03, builder.prototype.appendString, 'baz',
              0xD1, builder.prototype.appendUInt32BE, 0x0e, builder.prototype.appendUInt32BE, 0x02,
              0xA1, 0x03, builder.prototype.appendString, 'zap',
              0xA1, 0x03, builder.prototype.appendString, 'bop'
            ])
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
            name: 'ulong',
            value: buf([0x80, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
            expectedOutput: new Int64(0xFFFFFFFF, 0xFFFFFFFF)
          },
          {
            name: 'smallulong', value: buf([0x53, 0x01]),
            expectedOutput: new Int64(0x00000000, 0x00000001)
          },
          {
            name: 'ulong0',
            value: buf([0x44]),
            expectedOutput: new Int64(0x00000000, 0x00000000)
          },
          { name: 'byte', value: buf([0x51, 0x01]), expectedOutput: 1 },
          { name: 'short', value: buf([0x61, 0x00, 0x01]), expectedOutput: 1 },
          { name: 'int', value: buf([0x71, 0x00, 0x00, 0x00, 0x01]), expectedOutput: 1 },
          { name: 'smallint', value: buf([0x54, 0x01]), expectedOutput: 1 },
          {
            name: 'long',
            value: buf([0x81, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
            expectedOutput: new Int64(0xFFFFFFFF, 0xFFFFFFFF)
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
          // { name: 'utf32 (char)', type: 0x73, value: buf([0x24]), expectedOutput: '$' },
          // {
          //   name: 'uuid', type: 0x98,
          //   value: buf([
          //     0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
          //     0x09, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16
          //   ]),
          //   expectedOutput: 'some uuid'
          // },

          {
            name: 'ms64 (timestamp)',
            value: buf([0x83, 0x00, 0x00, 0x00, 0x00, 0x55, 0x10, 0x7B, 0x38]),
            expectedOutput: new Int64(1427143480)
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
            expectedOutput: new AMQPSymbol('foo')
          },
          { name: 'sym8 (empty)', value: buf([0xa3, 0]), expectedOutput: new AMQPSymbol('') },
          {
            name: 'sym32',
            value: buf([0xb3, builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo']),
            expectedOutput: new AMQPSymbol('foo')
          },
        ].forEach(testDecoding);
      });

      describe('collection', function() {
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
