'use strict';

var Int64 = require('node-int64'),
    expect = require('chai').expect,
    Builder = require('buffer-builder'),

    codec = require('../../lib/codec'),
    AMQPArray = require('../../lib/types/amqp_composites').Array,
    DescribedType = require('../../lib/types/described_type'),
    ForcedType = require('../../lib/types/forced_type'),

    tu = require('./../testing_utils');

var buildBuffer = tu.buildBuffer;
var newBuffer = tu.newBuffer;

describe('Codec', function() {
  describe('#decode()', function() {

    it('should match fixed values', function() {
      var buffer = newBuffer([0x50, 0x05]);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.eql(5);
      expect(actual[1]).to.eql(2);
    });

    it('should match simple values', function() {
      expect(codec.decode(newBuffer([0x40]))[0]).to.not.exist;

      expect(codec.decode(newBuffer([0x41]))[0]).to.be.true;
      expect(codec.decode(newBuffer([0x42]))[0]).to.be.false;
      expect(codec.decode(newBuffer([0x43]))[0]).to.eql(0);
      expect(codec.decode(newBuffer([0x44]))[0]).to.eql(0);
    });

    it('should match longs', function() {
      var buffer = newBuffer([0x80, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.eql(new Int64(new Buffer([0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80])));
      expect(actual[1]).to.eql(9);
    });

    it('should match floats', function() {
      var expected = new Buffer([0x01, 0x02, 0x03, 0x04]).readFloatBE(0);
      var buffer = newBuffer([0x72, 0x01, 0x02, 0x03, 0x04]);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.eql(expected);
      expect(actual[1]).to.eql(5);

      expected = new Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]).readDoubleBE(0);
      buffer = newBuffer([0x82, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
      actual = codec.decode(buffer);
      expect(actual[0]).to.eql(expected);
      expect(actual[1]).to.eql(9);
    });

    it('should match strings', function() {
      var buffer = newBuffer([0xA1, 0x3, 0x46, 0x4F, 0x4F]);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.eql('FOO');
      expect(actual[1]).to.eql(5);

      buffer = newBuffer([0xB1, 0x0, 0x0, 0x0, 0x3, 0x46, 0x4F, 0x4F]);
      actual = codec.decode(buffer);
      expect(actual[0]).to.eql('FOO');
      expect(actual[1]).to.eql(8);
    });

    it('should match buffers', function() {
      var buffer = newBuffer([0xA0, 0x3, 0x7b, 0x22, 0x7d]);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.be.instanceof(Buffer);
      tu.shouldBufEql(buildBuffer([0x7b, 0x22, 0x7d]), actual[0]);
      expect(actual[1]).to.eql(5);
    });

    it('should fail when not implemented', function() {
      // @todo: use a dec32 until support is added
      var buffer = newBuffer([0x74, 0x01, 0x02, 0x03, 0x04]);
      expect(function() { codec.decode(buffer); }).to.throw(Error);
    });

    it('should decode arrays', function() {
        var buffer = newBuffer([0xe0, 0x0a, 0x01, 0x83, 0x00, 0x00, 0x01, 0x58, 0x06, 0xf2, 0xfb, 0xc7]);
        var actual = codec.decode(buffer);
        expect(actual[0]).to.be.instanceof(Array);
        expect(actual[0][0]).to.be.instanceof(Date);
        expect(actual[0][0].getTime()).to.eql(0x15806f2fbc7);
        expect(actual[1]).to.eql(12);
    });

    it('should decode described types', function() {
      var buffer = newBuffer([0x00, 0xA1, 0x03, Builder.prototype.appendString, 'URL', 0xA1, 0x1E, Builder.prototype.appendString, 'http://example.org/hello-world']);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.be.an.instanceOf(DescribedType);
      expect(actual[0].descriptor).to.eql('URL');
      expect(actual[0].value).to.eql('http://example.org/hello-world');
    });

    it('should decode nested described types', function() {
      var buffer = newBuffer([0x00, 0xA1, 3, Builder.prototype.appendString, 'FOO', 0x00, 0xA1, 3, Builder.prototype.appendString, 'BAR', 0xA1, 3, Builder.prototype.appendString, 'BAZ']);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.be.an.instanceOf(DescribedType);
      expect(actual[0].value).to.be.an.instanceOf(DescribedType);
      expect(actual[0].descriptor).to.eql('FOO');
      expect(actual[0].value.descriptor).to.eql('BAR');
      expect(actual[0].value.value).to.eql('BAZ');
    });

    it('should decode nested described and composites', function() {
      // Described (int64(0x1), [ Described(int64(0x2), 'VAL') ])
      var buffer = newBuffer([0x00, 0x53, 0x1, 0xC0, (1 + 1 + 2 + 1 + 1 + 3), 1, 0x00, 0x53, 0x2, 0xA1, 3, Builder.prototype.appendString, 'VAL']);
      var actual = codec.decode(buffer);
      expect(actual[0]).to.be.an.instanceOf(DescribedType);
      expect(actual[0].value).to.be.an.instanceOf(Array);
      expect(actual[0].descriptor).to.eql(0x01);
      expect(actual[0].value).to.not.be.empty;
      expect(actual[0].value[0]).to.be.an.instanceOf(DescribedType);
      expect(actual[0].value[0].descriptor).to.eql(0x02);
      expect(actual[0].value[0].value).to.eql('VAL');
    });

    it('should decode forced-type values', function() {
      var buffer = buildBuffer([0x03, Builder.prototype.appendString, 'URL']);
      var actual = codec.decode(buffer, 0, 0xA3);
      expect(actual[0]).to.eql('URL');
      expect(actual[1]).to.eql(4); // Count + contents
    });

    it('should decode composite example from spec', function() {
      // From Page 25 of AMQP 1.0 spec
      var buffer = buildBuffer([0x00, 0xA3, 0x11,
        Builder.prototype.appendString, 'example:book:list',
        0xC0, 0x40, 0x03, 0xA1, 0x15,
        Builder.prototype.appendString, 'AMQP for & by Dummies',
        0xE0, 0x25, 0x02, 0xA1, 0x0E,
        Builder.prototype.appendString, 'Rob J. Godfrey',
        0x13,
        Builder.prototype.appendString, 'Rafael H. Schloming',
        0x40]);
      var actual = codec.decode(newBuffer(buffer));
      expect(actual[0]).to.eql(new DescribedType('example:book:list',
          [
           'AMQP for & by Dummies',
           ['Rob J. Godfrey', 'Rafael H. Schloming'],
           null
          ]));
    });

    it('should decode open frame received from ActiveMQ', function() {
      var buffer = buildBuffer([0x00,
        0x53, 0x10,
        0xc0, 0x0a, 0x03,
        0xa1, 0x00,
        0xa1, 0x00,
        0x70, 0x00, 0x10, 0x00, 0x00]);
      var actual = codec.decode(newBuffer(buffer));
      expect(actual[0]).to.eql(new DescribedType(0x10, ['', '', 0x00100000]));
    });

    /*
    // @todo: no longer relevant?
    it('should decode known type (AMQPError) from described type', function() {
      var buffer = buildBuffer([
        0x00, 0x53, 0x1D,
        0xD0, Builder.prototype.appendUInt32BE, (4 + 2 + 19 + 2 + 4 + 3), Builder.prototype.appendUInt32BE, 3,
        0xA3, 19, Builder.prototype.appendString, 'amqp:internal-error',
        0xA1, 4, Builder.prototype.appendString, 'test',
        0xC1, 1, 0x0 // empty info map
      ]);

      var actual = codec.decode(newBuffer(buffer));
      expect(actual).to.exist;
      expect(actual[0]).to.be.an.instanceOf(types.error);
      expect(actual[0].condition.contents).to.eql('amqp:internal-error');
      expect(actual[0].description).to.eql('test');
    });
    */
  });

  describe('#encode(buffer-builder)', function() {
    it('should encode strings', function() {
      var bufb = new Builder();
      codec.encode('FOO', bufb);
      tu.shouldBufEql([0xA1, 0x03, 0x46, 0x4F, 0x4F], bufb);
    });
    it('should encode symbols', function() {
      var bufb = new Builder();
      codec.encode(new ForcedType('symbol', 'FOO'), bufb);
      tu.shouldBufEql([0xA3, 0x03, 0x46, 0x4F, 0x4F], bufb);
    });
    it('should encode buffers', function() {
      var bufb = new Builder();
      codec.encode(buildBuffer([0xFF]), bufb);
      tu.shouldBufEql([0xA0, 1, 0xFF], bufb);
    });
    it('should encode long buffers', function() {
      var bufb = new Builder();
      bufb.appendUInt8(0xB0);
      bufb.appendUInt32BE(1024 * 4);
      for (var idx = 0; idx < 1024; ++idx) {
        bufb.appendUInt32BE(idx);
      }
      var expected = bufb.get();
      var encoded = expected.slice(5);
      var actual = new Builder();
      codec.encode(encoded, actual);
      tu.shouldBufEql(expected, actual);
    });
    it('should encode numbers', function() {
      var bufb = new Builder();
      codec.encode(123.456, bufb);
      var expected = new Buffer(9);
      expected[0] = 0x82;
      expected.writeDoubleBE(123.456, 1);
      tu.shouldBufEql(expected, bufb);

      bufb = new Builder();
      codec.encode(new Int64(0x12, 0x34), bufb);
      expected = buildBuffer([0x80, Builder.prototype.appendInt32BE, 0x12, Builder.prototype.appendInt32BE, 0x34]);
      tu.shouldBufEql(expected, bufb);

      bufb = new Builder();
      codec.encode(new Int64(0xFFFFFFFF, 0xFFFFFF00), bufb);
      expected = buildBuffer([0x81, Builder.prototype.appendInt32BE, 0xFFFFFFFF, Builder.prototype.appendInt32BE, 0xFFFFFF00]);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode lists', function() {
      var list = [1, 'foo'];
      var expected = buildBuffer([0xc0, (1 + 2 + 5), 2, 0x52, 1, 0xa1, 3, Builder.prototype.appendString, 'foo']);
      var bufb = new Builder();
      codec.encode(list, bufb);
      tu.shouldBufEql(expected, bufb);

      list = [];
      expected = buildBuffer([0x45]);
      bufb = new Builder();
      codec.encode(list, bufb);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode described types', function() {
      var bufb = new Builder();
      codec.encode(new DescribedType('D1', 'V1'), bufb);
      var expected = buildBuffer([0x00, 0xA3, 0x2, Builder.prototype.appendString, 'D1', 0xA1, 0x2, Builder.prototype.appendString, 'V1']);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode described types with no values', function() {
      var bufb = new Builder();
      codec.encode(new DescribedType(0x26), bufb);
      var expected = buildBuffer([0x00, 0x53, 0x26, 0x45]);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode forced-types when asked', function() {
      var toEncode = new ForcedType('uint', 0x123);
      var expected = buildBuffer([0x70, 0x00, 0x00, 0x01, 0x23]);
      var bufb = new Builder();
      codec.encode(toEncode, bufb);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode null', function() {
      var toEncode = null;
      var expected = buildBuffer([0x40]);
      var bufb = new Builder();
      codec.encode(toEncode, bufb);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode ForcedType with null value as null', function() {
      var toEncode = new ForcedType('uint', null);
      var expected = buildBuffer([0x40]);
      var bufb = new Builder();
      codec.encode(toEncode, bufb);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode amqp arrays', function() {
      var amqpArray = new AMQPArray([1, 2, 3], 0x71);
      var expected = buildBuffer([0xE0,
        /* size = (int32*3 + count + constructor) */ Builder.prototype.appendUInt8, (4 * 3 + 1 + 1),
        /* count */ Builder.prototype.appendUInt8, 3, /* constructor */ 0x71,
        Builder.prototype.appendUInt32BE, 1, Builder.prototype.appendUInt32BE, 2, Builder.prototype.appendUInt32BE, 3
      ]);
      var bufb = new Builder();
      codec.encode(amqpArray, bufb);
      tu.shouldBufEql(expected, bufb);
    });
    it('should encode composite example from spec', function() {
      // From Page 25 of AMQP 1.0 spec
      var expected = buildBuffer([0x00, 0xA3, 0x11,
        Builder.prototype.appendString, 'example:book:list',
        0xC0, 0x40, 0x03, 0xA1, 0x15,
        Builder.prototype.appendString, 'AMQP for & by Dummies',
        0xE0, 0x25, 0x02, 0xA1, 0x0E,
        Builder.prototype.appendString, 'Rob J. Godfrey',
        0x13,
        Builder.prototype.appendString, 'Rafael H. Schloming',
        0x40]);
      var bufb = new Builder();
      codec.encode(new DescribedType('example:book:list',
          [
           'AMQP for & by Dummies',
           new AMQPArray(['Rob J. Godfrey', 'Rafael H. Schloming'], 0xA1),
           null
          ]), bufb);
      tu.shouldBufEql(expected, bufb);
    });
  });
});
