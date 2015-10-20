"use strict";
var BufferBuilder = require('buffer-builder'),
    expect = require('chai').expect,

    codec = require('../../../lib/codec'),
    DeliveryState = require('../../../lib/types/delivery_state');

// @todo: this suite could use some actual structure, but for the moment
//        accurately tests the issue reported
describe('Types(DeliveryState)', function() {
  it('should encode Modified states', function() {
    var buffer = new BufferBuilder();
    var type = new DeliveryState.Modified({
      deliveryFailed: true, undeliverableHere: true, messageAnnotations: {}
    });

    codec.encode(type, buffer);
    expect(buffer.get())
      .to.eql(new Buffer([0x00, 0x53, 0x27, 0xc0, 0x06, 0x03, 0x41, 0x41, 0xc1, 0x01, 0x00]));
  });
});
