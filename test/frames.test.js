'use strict';

var frames = require('../lib/frames'),
    builder = require('buffer-builder'),
    constants = require('../lib/constants'),
    tu = require('./unit/testing_utils'),
    expect = require('chai').expect,

    AMQPError = require('../lib/types/amqp_error');

    // terminus = require('../lib/types/source_target'),
    // translator = require('../lib/adapters/translate_encoder');

describe('Frames', function() {
describe('OpenFrame', function() {
  it('should encode performative correctly', function() {
    var open = new frames.open({ containerId: 'test', hostname: 'localhost' });
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
    expect(open).to.be.instanceOf(frames.open);
    expect(open.maxFrameSize).to.eql(0x00100000);
  });
}); // OpenFrame

describe('BeginFrame', function() {
  it('should encode performative correctly', function() {
    var begin = new frames.begin({ nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100 });
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
    expect(begin).to.be.an.instanceOf(frames.begin);
    expect(begin.channel).to.eql(5);
    expect(begin.remoteChannel).to.eql(10);
    expect(begin.nextOutgoingId).to.eql(2);
    expect(begin.incomingWindow).to.eql(10);
    expect(begin.outgoingWindow).to.eql(11);
    expect(begin.handleMax).to.eql(100);
  });
}); // BeginFrame

/*
describe('AttachFrame', function() {
  it('should encode performative correctly', function() {
    var attach = new frames.Attach({
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

    console.log(attach);

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

    console.log('expected: ', expected.toString('hex'));
    console.log('  actual: ', actual.toString('hex'));

    tu.shouldBufEql(expected, actual);
  });

  it('should encode performative correctly (with source filter)', function() {
    var attach = new frames.Attach({
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
    attach.source.filter = translator([
      'described', ['symbol', 'apache.org:legacy-amqp-direct-binding:string'], ['string', 'news']
    ]);

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
    expect(attach).to.be.an.instanceOf(frames.Attach);
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
    expect(attach).to.be.an.instanceOf(frames.Attach);
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
    expect(attach).to.be.an.instanceOf(frames.Attach);
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
*/

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
    expect(flow).to.be.an.instanceOf(frames.flow);
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
    var flow = new frames.flow({
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
});

describe('DetachFrame', function() {
  // @todo missing encode
  // @todo missing decode
});

describe('EndFrame', function() {
  // @todo missing encode
  // @todo missing decode
});

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
    expect(close).to.be.an.instanceOf(frames.close);
    expect(close.error).to.not.exist;
  });

  it('should decode perfomative correctly (2)', function() {
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
    expect(close).to.be.an.instanceOf(frames.close);
    expect(close.error).to.be.an.instanceOf(AMQPError);
  });
});

}); // Frames

