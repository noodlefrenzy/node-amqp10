'use strict';
var ErrorCondition = require('../../../lib/types/error_condition'),
    frames = require('../../../lib/frames'),
    builder = require('buffer-builder'),
    tu = require('../../testing_utils'),
    expect = require('chai').expect;

describe('Types(Errors)', function() {
  var expected = tu.buildBuffer([
    0x00, 0x00, 0x00, 0x32,
    0x02, 0x00, 0x00, 0x00,
    0x00, 0x53, 0x18,
      0xc0, 0x25, 0x01,
      0x00, 0x53, 0x1d,
        0xc0, 0x1f, 0x03,
        0xa3, 0x13, builder.prototype.appendString, 'amqp:internal-error',  // condition
        0xa1, 0x04, builder.prototype.appendString, 'test',                 // description
        0xc1, 0x01, 0x00                                                    // info
  ]);

  var expectedWithoutDescription = tu.buildBuffer([
    0x00, 0x00, 0x00, 0x2d,
    0x02, 0x00, 0x00, 0x00,
    0x00, 0x53, 0x18,
      0xc0, 0x20, 0x01,
      0x00, 0x53, 0x1d,
        0xc0, 0x1a, 0x03,
        0xa3, 0x13, builder.prototype.appendString, 'amqp:internal-error',  // condition
        0x40,                                                               // description
        0xc1, 0x01, 0x00                                                    // info
  ]);

  it('should encode using direct type, enum error condition', function() {
    var close = new frames.CloseFrame({
      error: { condition: ErrorCondition.InternalError, description: 'test' }
    });

    var actual = tu.convertFrameToBuffer(close);
    expect(expected).to.eql(actual);
  });

  it('should encode using direct type, string error condition', function() {
    var close = new frames.CloseFrame({
      error: { condition: 'internal-error', description: 'test' }
    });

    var actual = tu.convertFrameToBuffer(close);
    expect(expected).to.eql(actual);
  });

  it('should encode using object, enum error condition', function() {
    var close = new frames.CloseFrame({
      error: { condition: ErrorCondition.InternalError, description: 'test' }
    });

    var actual = tu.convertFrameToBuffer(close);
    expect(expected).to.eql(actual);
  });

  it('should encode using object type, string error condition', function() {
    var close = new frames.CloseFrame({
      error: { condition: 'internal-error', description: 'test' }
    });

    var actual = tu.convertFrameToBuffer(close);
    expect(expected).to.eql(actual);
  });

  it('should encode using just an enum', function() {
    var close = new frames.CloseFrame({
      error: ErrorCondition.InternalError
    });

    var actual = tu.convertFrameToBuffer(close);
    expect(expectedWithoutDescription).to.eql(actual);
  });

  it('should encode using just a string', function() {
    var close = new frames.CloseFrame({
      error: 'internal-error'
    });

    var actual = tu.convertFrameToBuffer(close);
    expect(expectedWithoutDescription).to.eql(actual);
  });

});
