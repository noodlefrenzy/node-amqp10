'use strict';

var BufferBuilder = require('buffer-builder'),
    codec = require('../../lib/codec'),
    tu = require('./../testing_utils');

var buf = tu.buildBuffer;

var encoder = require('../../lib/adapters/translate_encoder');

function toBuilder(input) {
  var buffer = new BufferBuilder();
  var encoded = encoder(input);
  codec.encode(encoded, buffer);
  return buffer.get();
}

describe('TranslatorEncoder', function() {
  describe('#number()', function () {
    it('should encode to smallest possible', function() {
      var input = ['ulong', 0];
      var expected = buf([ 0x44 ]);
      tu.shouldBufEql(expected, toBuilder(input));

      input = ['ulong', 123];
      expected = buf([0x53, 123]);
      tu.shouldBufEql(expected, toBuilder(input));

      input = ['uint', 250];
      expected = buf([0x52, 250]);
      tu.shouldBufEql(expected, toBuilder(input));
    });
  });

  describe('#variable()', function() {
    it('should encode symbols', function() {
      var input = ['symbol', 'abc'];
      var expected = buf([0xa3, 3, 'abc']);
      tu.shouldBufEql(expected, toBuilder(input));
    });
  });

  describe('#described()', function() {
    it('should allow simple descriptors, values', function() {
      var str = 'open frame contents';
      var input = ['described', ['ulong', 0x10], str];
      var expected = buf([0x00, 0x53, 0x10, 0xa1, str.length, str]);
      tu.shouldBufEql(expected, toBuilder(input));
    });
  });

  describe('#list()', function() {
    it('should encode simple lists', function() {
      var input = ['list', 'val1', ['int', -123]];
      var expected = buf([0xc0, 1 + 6 + 2, 2, 0xa1, 4, 'val1', 0x54, -123]);
      tu.shouldBufEql(expected, toBuilder(input));
    });

    it('should encode empty lists', function() {
      var input = ['list'];
      var expected = buf([0x45]);
      tu.shouldBufEql(expected, toBuilder(input));
    });
  });

  describe('#map()', function() {
    it('should encode simple maps', function() {
      var input = ['map', 'key1', ['int', -123]];
      var expected = buf([0xc1, 1 + 6 + 2, 2, 0xa1, 4, 'key1', 0x54, -123]);
      tu.shouldBufEql(expected, toBuilder(input));
    });

    it('should encode empty maps', function() {
      var input = ['map'];
      var expected = buf([0xc1, 1, 0]);
      tu.shouldBufEql(expected, toBuilder(input));
    });
  });

  describe('#array()', function() {
    it('should be able to encode arrays of symbols', function () {
      var input = ['array', 'symbol', 'array', 'of', 'symbols'];
      var expected = buf([0xe0, 1 + 1 + 6 + 3 + 8, 3, 0xa3, 5, 'array', 2, 'of', 7, 'symbols']);
      tu.shouldBufEql(expected, toBuilder(input));
    });
  });
});
