'use strict';

var frames = require('../../lib/frames'),
    errors = require('../../lib/errors'),
    builder = require('buffer-builder'),
    constants = require('../../lib/constants'),
    tu = require('./../testing_utils'),
    expect = require('chai').expect,

    DeliveryState = require('../../lib/types/delivery_state'),
    AMQPError = require('../../lib/types/amqp_error'),
    ForcedType = require('../../lib/types/forced_type'),
    t = require('../../lib').Type,

    terminus = require('../../lib/types/terminus');

describe('Frames', function() {
describe('errors', function() {
  it('should throw an error on invalid DOFF', function() {
    var actual = new Buffer([ 0x41, 0x4d, 0x51, 0x50, 0x01, 0x01, 0x00, 0x0a ]);
    expect(function() { frames.readFrame(actual); }).to.throw(errors.MalformedHeaderError);
  });
}); // Errors

describe('OpenFrame', function() {
  it('should encode performative correctly', function() {
    var open = new frames.OpenFrame({ containerId: 'test', hostname: 'localhost' });
    var actual = tu.convertFrameToBuffer(open);
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, 0x3f,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x10,
        0xc0, 0x32, 0x0a, // list
        0xa1, 4, builder.prototype.appendString, 'test',
        0xa1, 9, builder.prototype.appendString, 'localhost',
        0x70, builder.prototype.appendUInt32BE, constants.defaultMaxFrameSize,
        0x60, builder.prototype.appendUInt16BE, constants.defaultChannelMax,
        0x70, builder.prototype.appendUInt32BE, constants.defaultIdleTimeout,
        0xa3, 5, builder.prototype.appendString, constants.defaultOutgoingLocales,
        0xa3, 5, builder.prototype.appendString, constants.defaultIncomingLocales,
        0x40, 0x40, 0xc1, 0x01, 0x00
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should decode perfomative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x17,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x10,
        0xc0, 0x0a, 0x03,
        0xa1, 0x00,
        0xa1, 0x00,
        0x70, 0x00, 0x10, 0x00, 0x00
    ]);

    var open = frames.readFrame(buffer);
    expect(open).to.be.instanceOf(frames.OpenFrame);
    expect(open.maxFrameSize).to.eql(0x00100000);
  });

  it('should decode perfomative correctly, using defaults where necessary', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0xb8,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x10,
      0xd0, 0x00, 0x00, 0x00, 0xa8, 0x00, 0x00, 0x00, 0x0a,
        0xa1, 0x24, 0x32, 0x35, 0x61, 0x66, 0x64, 0x62, 0x33, 0x36, 0x2d, 0x65, 0x34,
              0x62, 0x30, 0x2d, 0x34, 0x33, 0x33, 0x30, 0x2d, 0x39, 0x30, 0x37, 0x37,
              0x2d, 0x64, 0x36, 0x63, 0x65, 0x66, 0x61, 0x66, 0x33, 0x30, 0x37, 0x33,
              0x38,
        0x40,
        0x40,
        0x60, 0x7f, 0xff,
        0x70, 0x00, 0x01, 0xd4, 0xc0,
        0x40,
        0x40,
        0xf0, 0x00, 0x00, 0x00,         // list
          0x18, 0x00, 0x00, 0x00, 0x01, // length
          0xb3, 0x00, 0x00, 0x00, 0x0f, 0x41, 0x4e, 0x4f, 0x4e, 0x59, 0x4d, 0x4f, 0x55, 0x53, 0x2d, 0x52, 0x45, 0x4c, 0x41, 0x59,
        0x40,
        0xd1, 0x00, 0x00, 0x00, 0x4f, 0x00, 0x00, 0x00, 0x08,
          0xa3, 0x07, 0x70, 0x72, 0x6f, 0x64, 0x75, 0x63, 0x74,
          0xa1, 0x08, 0x71, 0x70, 0x69, 0x64, 0x2d, 0x63, 0x70, 0x70,
          0xa3, 0x07, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e,
          0xa1, 0x06, 0x31, 0x2e, 0x33, 0x35, 0x2e, 0x30,
          0xa3, 0x08, 0x70, 0x6c, 0x61, 0x74, 0x66, 0x6f, 0x72, 0x6d,
          0xa1, 0x05, 0x4c, 0x69, 0x6e, 0x75, 0x78,
          0xa3, 0x04, 0x68, 0x6f, 0x73, 0x74,
          0xa1, 0x0e, 0x73, 0x69, 0x6d, 0x75, 0x6c, 0x61, 0x74, 0x65, 0x64, 0x2d, 0x63, 0x65, 0x6c, 0x6c
    ]);

    var open = frames.readFrame(buffer);
    expect(open).to.be.instanceOf(frames.OpenFrame);
    expect(open.maxFrameSize).to.eql(4294967295);
  });

}); // OpenFrame

describe('BeginFrame', function() {
  it('should encode performative correctly', function() {
    var begin = new frames.BeginFrame({ nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100 });
    begin.channel = 1;

    var actual = tu.convertFrameToBuffer(begin);
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, 0x1F,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x11,
        0xc0, 0x12, 0x08,
        0x40,
        0x52, 0x01,
        0x52, 0x64,
        0x52, 0x64,
        0x70, builder.prototype.appendUInt32BE, constants.defaultHandleMax,
        0x40, 0x40, 0xc1, 0x01, 0x00
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should decode perfomative correctly', function() {
    var frameSize = (1 + 3 + 2 + 2 + 2 + 2);
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, (8 + 3 + 2 + frameSize),
      0x02, 0x00, 0x00, 0x05,
      0x00, 0x53, 0x11,
        0xc0, frameSize, 5,
        0x60, builder.prototype.appendUInt16BE, 10,
        0x52, 2,
        0x52, 10,
        0x52, 11,
        0x52, 100
    ]);

    var begin = frames.readFrame(buffer);
    expect(begin).to.exist;
    expect(begin).to.be.an.instanceOf(frames.BeginFrame);
    expect(begin.channel).to.eql(5);
    expect(begin.remoteChannel).to.eql(10);
    expect(begin.nextOutgoingId).to.eql(2);
    expect(begin.incomingWindow).to.eql(10);
    expect(begin.outgoingWindow).to.eql(11);
    expect(begin.handleMax).to.eql(100);
  });
}); // BeginFrame

describe('AttachFrame', function() {
  it('should encode performative correctly', function() {
    var attach = new frames.AttachFrame({
      name: 'test',
      handle: 1,
      role: constants.linkRole.sender,
      source: new terminus.Source({ address: null, dynamic: true }),
      target: new terminus.Target({ address: 'testtgt' }),
      initialDeliveryCount: 1,
      properties: {
        'com.microsoft:client-version': 'azure-iot-device/1.0.0-preview.9'
      }
    });
    attach.channel = 1;

    var actual = tu.convertFrameToBuffer(attach);
    var sourceSize = 1 + 1 + 1 + 13 + 1 + 1 + 3 + 1 + 3 + 1 + 1 + 1;
    var targetSize = 1 + 9 + 1 + 13 + 1 + 1 + 3 + 1;
    var propertiesSize = 4 + 28 + 32;
    var listSize = 1 + 6 + 2 + 1 + 2 + 2 + 3 + 2 + sourceSize + 3 + 2 + targetSize + 3 + 1 + 2 + 1 + 1 + 1 + 3 + propertiesSize;
    var listCount = 14;
    var frameSize = 1 + 1 + 9 + 2 + listSize;
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x12,
      0xc0, listSize, listCount,
        0xA1, 4, builder.prototype.appendString, 'test',
        0x52, 1, // handle
        0x42, // role=sender
        0x50, 2, // sender-settle-mode=mixed
        0x50, 0, // rcv-settle-mode=first

      0x00, 0x53, 0x28, // source
        0xc0, sourceSize, 11,
        0x40,
        0x43,
        0xA3, 11, builder.prototype.appendString, 'session-end',
        0x43,
        0x41,
        0xc1, 1, 0,
        0x40,
        0xc1, 1, 0,
        0x40,
        0x40,
        0x40,

      0x00, 0x53, 0x29, // target
        0xc0, targetSize, 7,
        0xA1, 7, builder.prototype.appendString, 'testtgt',
        0x43,
        0xA3, 11, builder.prototype.appendString, 'session-end',
        0x43,
        0x42,
        0xc1, 1, 0,
        0x40,

      0xc1, 1, 0,
      0x42,
      0x52, 1,
      0x44,
      0x40,
      0x40,

      0xc1, 65, 2, // properties
      0xA3, 28, builder.prototype.appendString, 'com.microsoft:client-version',
      0xA1, 32, builder.prototype.appendString, 'azure-iot-device/1.0.0-preview.9',
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should encode performative correctly (using requires)', function() {
    var attach = new frames.AttachFrame({
      name: 'test',
      handle: 1,
      role: 'sender',
      source: { address: null, dynamic: true },
      target: { address: 'testtgt' },
      initialDeliveryCount: 1,
      properties: {
        'com.microsoft:client-version': 'azure-iot-device/1.0.0-preview.9'
      }
    });
    attach.channel = 1;

    var actual = tu.convertFrameToBuffer(attach);
    var sourceSize = 1 + 1 + 1 + 13 + 1 + 1 + 3 + 1 + 3 + 1 + 1 + 1;
    var targetSize = 1 + 9 + 1 + 13 + 1 + 1 + 3 + 1;
    var propertiesSize = 4 + 28 + 32;
    var listSize = 1 + 6 + 2 + 1 + 2 + 2 + 3 + 2 + sourceSize + 3 + 2 + targetSize + 3 + 1 + 2 + 1 + 1 + 1 + 3 + propertiesSize;
    var listCount = 14;
    var frameSize = 1 + 1 + 9 + 2 + listSize;
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x12,
      0xc0, listSize, listCount,
        0xA1, 4, builder.prototype.appendString, 'test',
        0x52, 1, // handle
        0x42, // role=sender
        0x50, 2, // sender-settle-mode=mixed
        0x50, 0, // rcv-settle-mode=first

      0x00, 0x53, 0x28, // source
        0xc0, sourceSize, 11,
        0x40,
        0x43,
        0xA3, 11, builder.prototype.appendString, 'session-end',
        0x43,
        0x41,
        0xc1, 1, 0,
        0x40,
        0xc1, 1, 0,
        0x40,
        0x40,
        0x40,

      0x00, 0x53, 0x29, // target
        0xc0, targetSize, 7,
        0xA1, 7, builder.prototype.appendString, 'testtgt',
        0x43,
        0xA3, 11, builder.prototype.appendString, 'session-end',
        0x43,
        0x42,
        0xc1, 1, 0,
        0x40,

      0xc1, 1, 0,
      0x42,
      0x52, 1,
      0x44,
      0x40,
      0x40,

      0xc1, 65, 2, // properties
      0xA3, 28, builder.prototype.appendString, 'com.microsoft:client-version',
      0xA1, 32, builder.prototype.appendString, 'azure-iot-device/1.0.0-preview.9',
    ]);

    tu.shouldBufEql(expected, actual);
  });


  it('should encode performative correctly (with source filter)', function() {
    var attach = new frames.AttachFrame({
      name: 'test',
      handle: 1,
      role: constants.linkRole.sender,
      source: new terminus.Source({ address: null, dynamic: true }),
      target: new terminus.Target({ address: 'testtgt' }),
      initialDeliveryCount: 1,
      properties: {
        'com.microsoft:client-version': 'azure-iot-device/1.0.0-preview.9'
      }
    });
    attach.channel = 1;
    attach.source.filter = t.described(t.symbol('apache.org:legacy-amqp-direct-binding:string'), t.string('news'));

    var actual = tu.convertFrameToBuffer(attach);
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, 0xf2,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53,0x12,
        0xc0, 0xe5, 0x0e,
        0xa1, 0x04, builder.prototype.appendString, 'test',
        0x52, 0x01,
        0x42,
        0x50, 0x02,
        0x50, 0x00,

        0x00, 0x53, 0x28, // source
          0xc0, 0x63, 0x0b,
          0x40,
          0x43,
          0xa3, 11, builder.prototype.appendString, 'session-end',
          0x43,
          0x41,
          0xc1, 0x01, 0x00,
          0x40,
          0xc1, 0x48, 0x04,
          0xa3, 10, builder.prototype.appendString, 'descriptor',
          0xa3, 44, builder.prototype.appendString, 'apache.org:legacy-amqp-direct-binding:string',
          0xa3, 5,  builder.prototype.appendString, 'value',
          0xa1, 4,  builder.prototype.appendString, 'news',
          0x40,
          0x40,

        0x40, 0x00, 0x53, 0x29,
          0xc0, 0x1e, 0x07,
          0xa1, 7, builder.prototype.appendString, 'testtgt',
          0x43,
          0xa3, 11, builder.prototype.appendString, 'session-end',
          0x43,
          0x42,

        0xc1, 0x01, 0x00, 0x40,
        0xc1, 0x01, 0x00, 0x42,
        0x52, 0x01, 0x44, 0x40, 0x40,

        0xc1, 0x41, 0x02,  // properties
        0xA3, 28, builder.prototype.appendString, 'com.microsoft:client-version',
        0xA1, 32, builder.prototype.appendString, 'azure-iot-device/1.0.0-preview.9',
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should decode performative correctly (1) ', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x1e,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x12,
        0xc0, 0x11, 0x06,
        0xa1, 0x04, 0x74, 0x65, 0x73, 0x74,
        0x43, 0x41,
        0x50, 0x02,
        0x50, 0x00,
        0x00, 0x53, 0x28, 0x45
    ]);

    var attach = frames.readFrame(buffer);
    expect(attach).to.be.an.instanceOf(frames.AttachFrame);
    expect(attach.channel).to.eql(0);
    expect(attach.name).to.eql('test');
    expect(attach.handle).to.eql(0);
    expect(attach.role).to.eql(true);
    expect(attach.sndSettleMode).to.eql(constants.senderSettleMode.mixed);
    expect(attach.rcvSettleMode).to.eql(constants.receiverSettleMode.autoSettle);
  });

  it('should decode performative correctly (2)', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x1e,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x12,
        0xc0, 0x11, 0x06,
        0xa1, 0x04, 0x74, 0x65, 0x73, 0x74,
        0x43, 0x41,
        0x50, 0x02,
        0x50, 0x00,
        0x00, 0x53, 0x28, 0x45
    ]);

    var attach = frames.readFrame(buffer);
    expect(attach).to.be.an.instanceOf(frames.AttachFrame);
    expect(attach.channel).to.eql(0);
    expect(attach.name).to.eql('test');
    expect(attach.handle).to.eql(0);
    expect(attach.role).to.eql(true);
    expect(attach.sndSettleMode).to.eql(constants.senderSettleMode.mixed);
    expect(attach.rcvSettleMode).to.eql(constants.receiverSettleMode.autoSettle);
  });

  it('should decode performative correctly (3)', function() {
    var sourceSize = 1 + 1 + 1 + 13 + 1 + 1 + 3 + 1 + 3 + 1 + 1 + 1;
    var targetSize = 1 + 9 + 1 + 13 + 1 + 1 + 3 + 1;
    var propertiesSize = 4 + 28 + 32;
    var listSize = 1 + 6 + 2 + 1 + 2 + 2 + 3 + 2 + sourceSize + 3 + 2 + targetSize + 3 + 1 + 2 + 1 + 1 + 1 + 3 + propertiesSize;
    var listCount = 14;
    var frameSize = 1 + 1 + 9 + 2 + listSize;

    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x12,
        0xc0, listSize, listCount,
        0xA1, 4, builder.prototype.appendString, 'test',
        0x52, 1, // handle
        0x42, // role=sender
        0x50, 2, // sender-settle-mode=mixed
        0x50, 0, // rcv-settle-mode=first
        0x00, 0x53, 0x28, // source
        0xc0, sourceSize, 11,
          0x40,
          0x43,
          0xA3, 11, builder.prototype.appendString, 'session-end',
          0x43,
          0x41,
          0xc1, 1, 0,
          0x40,
          0xc1, 1, 0,
          0x40, 0x40, 0x40,
        0x00, 0x53, 0x29, // target
          0xc0, targetSize, 7,
          0xA1, 7, builder.prototype.appendString, 'testtgt',
          0x43,
          0xA3, 11, builder.prototype.appendString, 'session-end',
          0x43,
          0x42,
          0xc1, 1, 0,
          0x40,
          0xc1, 1, 0,
          0x42,
          0x52, 1,
          0x44, 0x40, 0x40,
        0xc1, 65, 2,
        0xA3, 28, builder.prototype.appendString, 'com.microsoft:client-version',
        0xA1, 32, builder.prototype.appendString, 'azure-iot-device/1.0.0-preview.9',
    ]);

    var attach = frames.readFrame(buffer);
    expect(attach).to.be.an.instanceOf(frames.AttachFrame);
    expect(attach.channel).to.eql(1);
    expect(attach.name).to.eql('test');
    expect(attach.handle).to.eql(1);
    expect(attach.role).to.eql(false);
    expect(attach.sndSettleMode).to.eql(constants.senderSettleMode.mixed);
    expect(attach.rcvSettleMode).to.eql(constants.receiverSettleMode.autoSettle);
    expect(attach.properties).to.eql({
      'com.microsoft:client-version': 'azure-iot-device/1.0.0-preview.9'
    });
  });

}); // AttachFrame

describe('FlowFrame', function() {
  it('should decode performative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x1f,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x13,
        0xc0, 0x12, 0x0b,
        0x43,
        0x52, 0xc8,
        0x52, 0x01,
        0x52, 0x64,
        0x43,
        0x40,
        0x52, 0x64,
        0x43,
        0x42,
        0x42,
        0xc1, 0x01, 0x00
    ]);

    var flow = frames.readFrame(buffer);
    expect(flow).to.be.an.instanceOf(frames.FlowFrame);
    expect(flow.nextIncomingId).to.equal(0);
    expect(flow.incomingWindow).to.equal(200);
    expect(flow.nextOutgoingId).to.equal(1);
    expect(flow.outgoingWindow).to.equal(100);
    expect(flow.handle).to.equal(0);
    expect(flow.deliveryCount).to.equal(null);
    expect(flow.linkCredit).to.equal(100);
    expect(flow.available).to.equal(0);
    expect(flow.drain).to.equal(false);
    expect(flow.echo).to.equal(false);
    expect(flow.properties).to.eql({});
  });

  it('should encode performative correctly', function() {
    var flow = new frames.FlowFrame({
      nextIncomingId: 1,
      incomingWindow: 100,
      nextOutgoingId: 1,
      outgoingWindow: 100,
      handle: 1,
      deliveryCount: 2,
      linkCredit: 100,
      available: 0,
      drain: false,
      echo: true
    });
    flow.channel = 1;

    var actual = tu.convertFrameToBuffer(flow);
    var listSize = 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 1 + 1 + 1 + 3;
    var frameSize = 1 + 1 + 9 + 2 + listSize;
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x13,
        0xc0, listSize, 11,
        0x52, 1,
        0x52, 100,
        0x52, 1,
        0x52, 100,
        0x52, 1,
        0x52, 2,
        0x52, 100,
        0x43,
        0x42,
        0x41,
        0xc1, 1, 0
    ]);

    tu.shouldBufEql(expected, actual);
  });
}); // FlowFrame

describe('DetachFrame', function() {
  // @todo missing encode
  // @todo missing decode
  it('should decode performative correctly with nonstandard error condition (#293)', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x01, 0x3c, 0x02, 0x00, 0x00, 0x00, 0x00, 0x53, 0x16, 0xd0, 0x00, 0x00,
      0x01, 0x2c, 0x00, 0x00, 0x00, 0x03, 0x43, 0x41, 0x00, 0x53, 0x1d, 0xd0, 0x00, 0x00,
      0x01, 0x1e, 0x00, 0x00, 0x00, 0x03, 0xa3, 0x23, 0x63, 0x6f, 0x6d, 0x2e, 0x6d, 0x69,
      0x63, 0x72, 0x6f, 0x73, 0x6f, 0x66, 0x74, 0x3a, 0x61, 0x72, 0x67, 0x75, 0x6d, 0x65,
      0x6e, 0x74, 0x2d, 0x6f, 0x75, 0x74, 0x2d, 0x6f, 0x66, 0x2d, 0x72, 0x61, 0x6e, 0x67,
      0x65, 0xa1, 0xf2, 0x54, 0x68, 0x65, 0x20, 0x73, 0x70, 0x65, 0x63, 0x69, 0x66, 0x69,
      0x65, 0x64, 0x20, 0x70, 0x61, 0x72, 0x74, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x20, 0x69,
      0x73, 0x20, 0x69, 0x6e, 0x76, 0x61, 0x6c, 0x69, 0x64, 0x20, 0x66, 0x6f, 0x72, 0x20,
      0x61, 0x6e, 0x20, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x48, 0x75, 0x62, 0x20, 0x70, 0x61,
      0x72, 0x74, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x20, 0x73, 0x65, 0x6e, 0x64, 0x65, 0x72,
      0x20, 0x6f, 0x72, 0x20, 0x72, 0x65, 0x63, 0x65, 0x69, 0x76, 0x65, 0x72, 0x2e, 0x20,
      0x49, 0x74, 0x20, 0x73, 0x68, 0x6f, 0x75, 0x6c, 0x64, 0x20, 0x62, 0x65, 0x20, 0x62,
      0x65, 0x74, 0x77, 0x65, 0x65, 0x6e, 0x20, 0x30, 0x20, 0x61, 0x6e, 0x64, 0x20, 0x37,
      0x2e, 0x0d, 0x0a, 0x50, 0x61, 0x72, 0x61, 0x6d, 0x65, 0x74, 0x65, 0x72, 0x20, 0x6e,
      0x61, 0x6d, 0x65, 0x3a, 0x20, 0x50, 0x61, 0x72, 0x74, 0x69, 0x74, 0x69, 0x6f, 0x6e,
      0x49, 0x64, 0x20, 0x54, 0x72, 0x61, 0x63, 0x6b, 0x69, 0x6e, 0x67, 0x49, 0x64, 0x3a,
      0x63, 0x32, 0x31, 0x38, 0x65, 0x33, 0x36, 0x31, 0x61, 0x35, 0x35, 0x32, 0x34, 0x63,
      0x39, 0x66, 0x61, 0x64, 0x66, 0x34, 0x36, 0x33, 0x31, 0x61, 0x32, 0x64, 0x61, 0x65,
      0x32, 0x37, 0x65, 0x63, 0x5f, 0x47, 0x34, 0x37, 0x2c, 0x20, 0x53, 0x79, 0x73, 0x74,
      0x65, 0x6d, 0x54, 0x72, 0x61, 0x63, 0x6b, 0x65, 0x72, 0x3a, 0x67, 0x61, 0x74, 0x65,
      0x77, 0x61, 0x79, 0x36, 0x2c, 0x20, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d,
      0x70, 0x3a, 0x32, 0x2f, 0x37, 0x2f, 0x32, 0x30, 0x31, 0x37, 0x20, 0x37, 0x3a, 0x32,
      0x37, 0x3a, 0x32, 0x30, 0x20, 0x50, 0x4d, 0x40
    ]);

    var detach = frames.readFrame(buffer);
    expect(detach).to.exist;
    expect(detach).to.be.an.instanceOf(frames.DetachFrame);
    expect(detach.error.condition).to.eql('com.microsoft:argument-out-of-range');
  });
}); // DetachFrame

describe('EndFrame', function() {
  // @todo missing encode
  // @todo missing decode
}); // EndFrame

describe('CloseFrame', function() {
  // @todo missing encode
  it('should decode perfomative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x0c,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x18,
      0x45
    ]);

    var close = frames.readFrame(buffer);
    expect(close).to.exist;
    expect(close).to.be.an.instanceOf(frames.CloseFrame);
    expect(close.error).to.not.exist;
  });

  it('should decode perfomative correctly (with error)', function() {
    var sizeOfError = (4 + 2 + 19 + 2 + 4 + 3);
    var sizeOfCloseFrameList = (4 + 3 + 1 + 4 + sizeOfError);
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, (8 + 3 + 1 + 4 + sizeOfCloseFrameList),
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x18,
        0xd0, builder.prototype.appendUInt32BE, sizeOfCloseFrameList, builder.prototype.appendUInt32BE, 1,
        0x00, 0x53, 0x1d,
          0xd0, builder.prototype.appendUInt32BE, sizeOfError, builder.prototype.appendUInt32BE, 3,
          0xa3, 19, builder.prototype.appendString, 'amqp:internal-error',
          0xa1, 4, builder.prototype.appendString, 'test',
          0xc1, 1, 0
    ]);

    var close = frames.readFrame(buffer);
    expect(close).to.exist;
    expect(close).to.be.an.instanceOf(frames.CloseFrame);
    expect(close.error).to.be.an.instanceOf(AMQPError);
    expect(close.error.condition).to.eql('amqp:internal-error');
    expect(close.error.description).to.equal('test');
    expect(close.error.info).to.eql({});
  });
}); // CloseFrame

describe('TransferFrame', function() {
  it('should encode performative correctly', function() {
    var transfer = new frames.TransferFrame({
      handle: 1,
      deliveryId: 1,
      deliveryTag: tu.buildBuffer([1]),
      messageFormat: 20000,
      settled: true,
      receiverSettleMode: constants.receiverSettleMode.autoSettle
    });
    transfer.channel = 1;
    transfer.payload = new Buffer([0x00, 0x53, 0x77, 0x52, 10]);

    var actual = tu.convertFrameToBuffer(transfer);
    var payloadSize = 12;
    var listSize = 1 + 2 + 2 + 3 + 5 + 1 + 1 + 2 + 1 + 1 + 1 + 1;
    var frameSize = 1 + 1 + 2 + 2 + listSize + payloadSize;
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x14,
        0xc0, listSize, 11,
        0x52, 1, // handle
        0x52, 1, // delivery-id
        0xA0, 1, 1, // delivery-tag
        0x70, builder.prototype.appendUInt32BE, 20000, // message-format
        0x41, // settled
        0x42, // more
        0x50, 0, // rcv-settle-mode
        0x40, // state
        0x42, 0x42, 0x42, // resume/aborted/batchable

        // Message Body - amqp-value of uint(10)
        0x00, 0x53, 0x77,
        0x52, 10
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should encode performative correctly (with requires)', function() {
    var transfer = new frames.TransferFrame({
      handle: 1,
      deliveryId: 1,
      deliveryTag: tu.buildBuffer([1]),
      messageFormat: 20000,
      settled: true,
      receiverSettleMode: 'auto'
    });
    transfer.channel = 1;
    transfer.payload = new Buffer([0x00, 0x53, 0x77, 0x52, 10]);

    var actual = tu.convertFrameToBuffer(transfer);
    var payloadSize = 12;
    var listSize = 1 + 2 + 2 + 3 + 5 + 1 + 1 + 2 + 1 + 1 + 1 + 1;
    var frameSize = 1 + 1 + 2 + 2 + listSize + payloadSize;
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x00, 0x00, 0x01,
      0x00, 0x53, 0x14,
        0xc0, listSize, 11,
        0x52, 1, // handle
        0x52, 1, // delivery-id
        0xA0, 1, 1, // delivery-tag
        0x70, builder.prototype.appendUInt32BE, 20000, // message-format
        0x41, // settled
        0x42, // more
        0x50, 0, // rcv-settle-mode
        0x40, // state
        0x42, 0x42, 0x42, // resume/aborted/batchable

        // Message Body - amqp-value of uint(10)
        0x00, 0x53, 0x77,
        0x52, 10
    ]);

    tu.shouldBufEql(expected, actual);
  });

  /*
  it('should decode the performative correctly (trivial message body)', function() {
    var listSize = 1 + 2 + 2 + 3 + 3 + 2 + 4;
    var payloadSize = 5;
    var txFrameSize = 8 + 3 + 2 + listSize + payloadSize;
    var channel = 1;
    var handle = 1;
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, txFrameSize,
      0x02, 0x00, 0x00, channel,
        0x00, 0x53, 0x14,
        0xc0, listSize, 10,
        0x52, handle,
        0x52, 1, // delivery-id
        0xa0, 1, 1, // delivery-tag
        0x43, // message-format
        0x41, // settled=true
        0x42, // more=false
        0x50, 0, // rcv-settle-mode=first
        0x40, // state=null
        0x42, // resume=false
        0x42, // aborted=false
        0x42, // batchable=false

      // Message Body - amqp-value of uint(10)
      0x00, 0x53, 0x77,
      0x52, 10
    ]);

    var transfer = frames.readFrame(buffer);
    console.dir(transfer, { depth: null });
    expect(transfer).to.be.an.instanceOf(frames.TransferFrame);
    expect(transfer.channel).to.eql(channel);
    expect(transfer.handle).to.eql(handle);
    expect(transfer.rcvSettleMode).to.eql(constants.receiverSettleMode.autoSettle);
    expect(transfer.payload).to.have.length(5);

    // var message = transfer.decodePayload();
    // expect(message.body[0]).to.eql(10);
  });
  */

}); // TransferFrame

describe('DispositionFrame', function() {
  it('should encode the performative correctly', function() {
    var disposition = new frames.DispositionFrame({
      role: constants.linkRole.receiver,
      first: 1,
      settled: true,
      state: new DeliveryState.Accepted()
    });

    var actual = tu.convertFrameToBuffer(disposition);
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, 0x18,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x15,
        0xc0, 0x0b, 0x06,
        0x41,
        0x52, 0x01,
        0x40,
        0x41,
        0x00, 0x53, 0x24, 0x45, // Accepted
        0x42  // batchable
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should encode the performative correctly (with requires)', function() {
    var disposition = new frames.DispositionFrame({
      role: 'receiver',
      first: 1,
      settled: true,
      state: new DeliveryState.Accepted()
    });

    var actual = tu.convertFrameToBuffer(disposition);
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, 0x18,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x15,
        0xc0, 0x0b, 0x06,
        0x41,
        0x52, 0x01,
        0x40,
        0x41,
        0x00, 0x53, 0x24, 0x45, // Accepted
        0x42  // batchable
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should decode the perfomative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x18,
      0x02, 0x00, 0x00, 0x00,
      0x00, 0x53, 0x15,
        0xc0, 0x0b, 0x06,
        0x41,
        0x52, 0x01,
        0x40,
        0x41,
        0x00, 0x53, 0x24, 0x45, // Accepted
        0x42  // batchable
    ]);

    var disposition = frames.readFrame(buffer);
    expect(disposition).to.be.an.instanceof(frames.DispositionFrame);
    expect(disposition.role).to.equal(true);
    expect(disposition.first).to.equal(1);
    expect(disposition.last).to.equal(null);
    expect(disposition.settled).to.equal(true);
    expect(disposition.state).to.be.an.instanceof(DeliveryState.Accepted);
    expect(disposition.batchable).to.equal(false);
  });
});

describe('HeartbeatFrame', function() {
  it('should encode correctly', function() {
    var heartbeat = new frames.HeartbeatFrame();
    var actual = tu.convertFrameToBuffer(heartbeat);
    var expected = tu.buildBuffer([0, 0, 0, 8, 2, 0, 0, 0]);
    tu.shouldBufEql(expected, actual);
  });
});

describe('SaslMechanismsFrame', function() {
  // @todo missing encode
  it('should encode correctly', function() {
    var mechanisms = new frames.SaslMechanismsFrame({
      saslServerMechanisms: [ 'ANONYMOUS' ]
    });

    var actual = tu.convertFrameToBuffer(mechanisms);
    var frameSize = 8 + 1 + 2 + 3 + 2 + 'ANONYMOUS'.length;
    var expected = tu.buildBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x01, 0x00, 0x00,
      0x00, 0x53, 0x40,
        0xc0, 9 + 3, 1,
        0xa3, 9, builder.prototype.appendString, 'ANONYMOUS'
    ]);

    tu.shouldBufEql(expected, actual);
  });

  it('should decode correctly', function() {
    var arraySize = 1 + 1 + 6 + 5;
    var frameSize = 8 + 2 + 1 + 2 + 3 + arraySize;
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, frameSize,
      0x02, 0x01, 0x00, 0x00,
      0x00, 0x53, 0x40,
      0xc0, arraySize + 3, 1,
        0xe0, arraySize, 2, 0xa3,
          5, builder.prototype.appendString, 'PLAIN',
          4, builder.prototype.appendString, 'CRAP'
    ]);

    var mechanisms = frames.readFrame(buffer);
    expect(mechanisms).to.be.an.instanceOf(frames.SaslMechanismsFrame);
    expect(mechanisms.saslServerMechanisms).to.have.length(2);
    expect(mechanisms.saslServerMechanisms[0]).to.eql(new ForcedType('symbol', 'PLAIN'));
    expect(mechanisms.saslServerMechanisms[1]).to.eql(new ForcedType('symbol', 'CRAP'));
  });

}); // SaslMechanismsFrame

describe('SaslInitFrame', function() {
  // @todo missing encode
  it('should decode the performative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x24,
      0x02, 0x01, 0x00, 0x00,
      0x00, 0x53, 0x41,
      0xc0, 0x17, 0x03,
        0xa3, 0x05, 0x50, 0x4c, 0x41, 0x49, 0x4e,
        0xa0, 0x0c, 0x00, 0x61, 0x64, 0x6d, 0x69, 0x6e, 0x00, 0x61, 0x64, 0x6d, 0x69, 0x6e,
        0x40
    ]);

    var init = frames.readFrame(buffer);
    expect(init).to.be.an.instanceOf(frames.SaslInitFrame);
    expect(init.mechanism).to.eql('PLAIN');
    expect(init.initialResponse).to.eql(new Buffer('0061646d696e0061646d696e', 'hex'));
    expect(init.hostname).to.be.null;
  });
}); // SaslInitFrame

describe('SaslChallengeFrame', function() {
  // @todo missing encode
  it('should decode the performative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x18,
      0x02, 0x01, 0x00, 0x00,
      0x00, 0x53, 0x42,
      0xc0, 0x0b, 0x01,
        0xa0, 0x08, 0x62, 0x61, 0x62, 0x61, 0x79, 0x61, 0x67, 0x61
    ]);

    var challenge = frames.readFrame(buffer);
    expect(challenge).to.be.an.instanceOf(frames.SaslChallengeFrame);
    expect(challenge.challenge).to.eql(new Buffer('6261626179616761', 'hex'));
  });
}); // SaslChallengeFrame

describe('SaslResponseFrame', function() {
  // @todo missing encode
  it('should decode the performative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x18,
      0x02, 0x01, 0x00, 0x00,
      0x00, 0x53, 0x43,
      0xc0, 0x0b, 0x01,
        0xa0, 0x08, 0x62, 0x61, 0x62, 0x61, 0x79, 0x61, 0x67, 0x61
    ]);

    var response = frames.readFrame(buffer);
    expect(response).to.be.an.instanceOf(frames.SaslResponseFrame);
    expect(response.response).to.eql(new Buffer('6261626179616761', 'hex'));
  });
}); // SaslResponseFrame

describe('SaslOutcomeFrame', function() {
  // @todo missing encode
  it('should decode the performative correctly', function() {
    var buffer = tu.newBuffer([
      0x00, 0x00, 0x00, 0x1a,
      0x02, 0x01, 0x00, 0x00,
      0x00, 0x53, 0x44,
      0xc0, 0x0d, 0x02,
        0x50, 0x01,
        0xa0, 0x08, 0x62, 0x61, 0x62, 0x61, 0x79, 0x61, 0x67, 0x61

    ]);

    var outcome = frames.readFrame(buffer);
    expect(outcome).to.be.an.instanceOf(frames.SaslOutcomeFrame);
    expect(outcome.code).to.eql(1);
    expect(outcome.additionalData).to.eql(new Buffer('6261626179616761', 'hex'));
  });
}); // SaslOutcomeFrame

}); // Frames

