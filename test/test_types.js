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

    AMQPSymbol = require('../lib/types/amqp_symbol'),

    tu = require('./testing_utils');

var buf = tu.buildBuffer;

describe('Types', function() {
  describe('#encoding', function() {
    function testEncoding(test) {
      it(test.name, function() {
        var encode = types.builders[test.type || test.name];
        expect(encode).to.not.be.undefined;
        var buffer = new BufferBuilder();
        encode(test.value, buffer, codec);
        tu.shouldBufEql(test.expectedOutput, buffer.get());
      });
    }

    describe('primitives', function() {
      describe('scalar', function() {
        [
          { name: 'null', value: null, expectedOutput: buf([0x40]) },
          { name: 'boolean(true)', type: 'boolean', value: true, expectedOutput: buf([0x41]) },
          { name: 'boolean(false)', type: 'boolean', value: false, expectedOutput: buf([0x42]) },
          {
            name: 'uint', value: 10000,
            expectedOutput: buf([0x70, builder.prototype.appendUInt32BE, 10000])
          },
          {
            name: 'uint', value: 100,
            expectedOutput: buf([0x52, builder.prototype.appendUInt8, 100])
          },
          { name: 'uint', value: 0, expectedOutput: buf([0x43]) },
          {
            name: 'int', value: -10000,
            expectedOutput: buf([0x71, builder.prototype.appendInt32BE, -10000])
          },
          {
            name: 'double', value: 123.45,
            expectedOutput: buf([0x82, builder.prototype.appendDoubleBE, 123.45])
          },
          {
            name: 'long', value: new Int64(0xFFFFFFFF, 0xFFFFFFFF),
            expectedOutput: buf([0x81, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF])
          },
          {
            name: 'string', value: 'foo',
            expectedOutput: buf([0xA1, 0x03, builder.prototype.appendString, 'foo'])
          }
        ].forEach(testEncoding);
      });

      describe('collection', function() {
        [
          { name: 'list(empty)', type: 'list', value: [], expectedOutput: buf([0x45]) },
          {
            name: 'list', value: [123, 456],
            expectedOutput: buf([0xC0, 0xB, 0x2, 0x71, builder.prototype.appendInt32BE, 123, 0x71, builder.prototype.appendInt32BE, 456])
          },
          { name: 'map(empty)', type: 'map', value: {}, expectedOutput: buf([0xc1, 0x1, 0x0]) },
          {
            name: 'map', value: { foo: 123, bar: 45.6 },
            expectedOutput: buf([0xD1,
              builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x04,
              0xA1, 0x03, builder.prototype.appendString, 'foo',
              0x71, builder.prototype.appendInt32BE, 123,
              0xA1, 0x03, builder.prototype.appendString, 'bar',
              0x82, builder.prototype.appendDoubleBE, 45.6])
          },
          {
            name: 'map(nested)', type: 'map', value: { baz: { zap: 'bop' } },
            expectedOutput: buf([0xD1,
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
        var decode = types.decoders[test.type];
        expect(decode).to.not.be.undefined;
        expect(decode).to.be.an.instanceOf(Function);

        var actual = decode(test.value, codec);
        if (actual instanceof Buffer) {
          console.log(actual.toString());
        }

        expect(actual).to.eql(test.expectedOutput);
      });
    }

    describe('primitives', function() {
      describe('scalar', function() {
        [
          { name: 'null', type: 0x40, value: new Buffer([]), expectedOutput: null },
          { name: 'true', type: 0x41, value: new Buffer([]), expectedOutput: true },
          { name: 'false', type: 0x42, value: new Buffer([]), expectedOutput: false },
          { name: 'boolean(true)', type: 0x56, value: buf([0x01]), expectedOutput: true },
          { name: 'boolean(false)', type: 0x56, value: buf([0x00]), expectedOutput: false },
          { name: 'ubyte', type: 0x50, value: buf([0x01]), expectedOutput: 1 },
          { name: 'ushort', type: 0x60, value: buf([0x00, 0x01]), expectedOutput: 1 },
          {
            name: 'uint', type: 0x70,
            value: buf([builder.prototype.appendInt32BE, 123]),
            expectedOutput: 123
          },
          { name: 'smalluint', type: 0x52, value: buf([0x01]), expectedOutput: 1 },
          { name: 'uint0', type: 0x43, value: new Buffer([]), expectedOutput: 0 },

          {
            name: 'ulong', type: 0x80,
            value: buf([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
            expectedOutput: new Int64(0xFFFFFFFF, 0xFFFFFFFF)
          },
          {
            name: 'smallulong', type: 0x53, value: buf([0x01]),
            expectedOutput: new Int64(0x00000000, 0x00000001)
          },
          {
            name: 'ulong0', type: 0x44,
            value: buf([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            expectedOutput: new Int64(0x00000000, 0x00000000)
          },
          { name: 'byte', type: 0x51, value: buf([0x01]), expectedOutput: 1 },
          { name: 'short', type: 0x61, value: buf([0x00, 0x01]), expectedOutput: 1 },
          { name: 'int', type: 0x71, value: buf([0x00, 0x00, 0x00, 0x01]), expectedOutput: 1 },
          { name: 'smallint', type: 0x54, value: buf([0x01]), expectedOutput: 1 },
          {
            name: 'long', type: 0x81,
            value: buf([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
            expectedOutput: new Int64(0xFFFFFFFF, 0xFFFFFFFF)
          },
          { name: 'smalllong', type: 0x55, value: buf([0x23]), expectedOutput: 0x23 },
          // {
          //   name: 'float', type: 0x72,
          //   value: buf([builder.prototype.appendFloatBE, 123.45]),
          //   expectedOutput: 123.45
          // },
          {
            name: 'double', type: 0x82,
            value: buf([builder.prototype.appendDoubleBE, 123.45]),
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
          // { name: 'vbin8', type: 0xa0, value: buf([0x10]), expectedOutput: new Buffer([0x10]) },
          // { name: 'vin32', type: 0xb0, value: buf([0x01, 0x02, 0x03, 0x04]), expectedOutput: new Buffer([0x01, 0x02, 0x03, 0x04]) },

          {
            name: 'str8-utf8', type: 0xa1,
            value: buf([3, builder.prototype.appendString, 'foo']),
            expectedOutput: 'foo'
          },
          { name: 'str8-utf8 (empty)', type: 0xa1, value: buf([0]), expectedOutput: '' },
          {
            name: 'str32-utf8', type: 0xb1,
            value: buf([builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo']),
            expectedOutput: 'foo'
          },
          {
            name: 'sym8', type: 0xa3,
            value: buf([3, builder.prototype.appendString, 'foo']),
            expectedOutput: new AMQPSymbol('foo')
          },
          { name: 'sym8 (empty)', type: 0xa3, value: buf([0]), expectedOutput: new AMQPSymbol('') },
          {
            name: 'sym32', type: 0xb3,
            value: buf([builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo']),
            expectedOutput: new AMQPSymbol('foo')
          },
        ].forEach(testDecoding);
      });

      describe('collection', function() {
        [
          { name: 'list0', type: 0x45, value: new Buffer([]), expectedOutput: [] },
          {
            name: 'list8', type: 0xC0,
            value: buf([0xB, 0x2, 0x71, builder.prototype.appendInt32BE, 123, 0x71, builder.prototype.appendInt32BE, 456]),
            expectedOutput: [123, 456]
          },
          {
            name: 'array8', type: 0xE0,
            value: buf([(10 + 1 + 1), 2, 0xA1,
              4, builder.prototype.appendString, 'elt1',
              4, builder.prototype.appendString, 'elt2'
            ]),
            expectedOutput: ['elt1', 'elt2']
          },
          {
            name: 'array32', type: 0xF0,
            value: buf([builder.prototype.appendUInt32BE, (10 + 4 + 1),
              builder.prototype.appendUInt32BE, 2,
              0xA1,
              4, builder.prototype.appendString, 'elt1',
              4, builder.prototype.appendString, 'elt2'
            ]),
            expectedOutput: ['elt1', 'elt2']
          },
          { name: 'map8 (empty)', type: 0xC1, value: buf([0x1, 0x0]), expectedOutput: {} },
          {
            name: 'map8', type: 0xD1,
            value: buf([
              builder.prototype.appendUInt32BE, 0x1c, builder.prototype.appendUInt32BE, 0x04,
              0xA1, 0x03, builder.prototype.appendString, 'foo',
              0x71, builder.prototype.appendInt32BE, 123,
              0xA1, 0x03, builder.prototype.appendString, 'bar',
              0x82, builder.prototype.appendDoubleBE, 45.6
            ]),
            expectedOutput: { foo: 123, bar: 45.6 }
          },
          {
            name: 'map32', type: 0xD1,
            value: buf([
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
