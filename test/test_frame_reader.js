'use strict';

var Int64 = require('node-int64'),
    should = require('should'),
    expect = require('chai').expect,

    debug = require('debug')('amqp10-test-FrameReader'),
    builder = require('buffer-builder'),

    constants = require('../lib/constants'),
    codec = require('../lib/codec'),
    exceptions = require('../lib/exceptions'),

    AMQPError = require('../lib/types/amqp_error'),
    Delivery = require('../lib/types/delivery_state'),
    DescribedType = require('../lib/types/described_type'),
    ForcedType = require('../lib/types/forced_type'),
    reader = require('../lib/frames/frame_reader'),

    AttachFrame = require('../lib/frames/attach_frame'),
    BeginFrame = require('../lib/frames/begin_frame'),
    CloseFrame = require('../lib/frames/close_frame'),
    DispositionFrame = require('../lib/frames/disposition_frame'),
    FlowFrame = require('../lib/frames/flow_frame'),
    OpenFrame = require('../lib/frames/open_frame'),
    TransferFrame = require('../lib/frames/transfer_frame'),

    Sasl = require('../lib/frames/sasl_frame'),

    tu = require('./testing_utils');

describe('FrameReader', function() {
  describe('#exceptions', function() {
    it('should throw an exception on unsupported frame type', function() {
      var buffer = tu.newBuffer([
        0x00, 0x00, 0x00, 0x17,
        0x02, 0x02, 0x00, 0x00,
        0x00,
        0x53, 0x10,
        0xc0, 0x0a, 0x03,
        0xa1, 0x00,
        0xa1, 0x00,
        0x70, 0x00, 0x10, 0x00, 0x00
      ]);

      expect(function() { reader.read(buffer); }).to.throw(exceptions.NotImplementedError);
    });

    it('should throw an exception on invalid AMQP performative', function() {
      var buffer = tu.newBuffer([
        0x00, 0x00, 0x00, 0x17,
        0x02, 0x00, 0x00, 0x00,
        0x00,
        0x53, 0xff,
        0xc0, 0x0a, 0x03,
        0xa1, 0x00,
        0xa1, 0x00,
        0x70, 0x00, 0x10, 0x00, 0x00
      ]);

      expect(function() { reader.read(buffer); }).to.throw(exceptions.MalformedPayloadError);
    });

    it('should throw an exception on invalid SASL performative', function() {
      var buffer = tu.newBuffer([
        0x00, 0x00, 0x00, 0x17,
        0x02, 0x01, 0x00, 0x00,
        0x00,
        0x53, 0xff,
        0xc0, 0x0a, 0x03,
        0xa1, 0x00,
        0xa1, 0x00,
        0x70, 0x00, 0x10, 0x00, 0x00
      ]);

      expect(function() { reader.read(buffer); }).to.throw(exceptions.MalformedPayloadError);
    });

    it('should throw an exception on malformed payload', function() {
      var buffer = tu.newBuffer([
        0x00, 0x00, 0x00, 0x17,
        0x02, 0x00, 0x00, 0x00,
        0x00,
        0x53, 0x10,
        0xff, 0x0a, 0x03,
        0xa1, 0x00,
        0xa1, 0x00,
        0x70, 0x00, 0x10, 0x00, 0x00
      ]);

      expect(function() { reader.read(buffer); }).to.throw(exceptions.MalformedPayloadError);
    });
  });




  describe('#read()', function() {
    describe('AMQP frames', function() {
      it('should return undefined on incomplete buffer', function() {
        var buffer = tu.newBuffer([0x00, 0x00, 0x00, 0x17,
          0x02, 0x00, 0x00, 0x00,
          0x00,
          0x53, 0x10
        ]);
        var newOpen = reader.read(buffer);
        (newOpen === undefined).should.be.true;
      });

      it('heartbeat (empty payload)', function() {
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, 0x00,
          0x02, 0x00, 0x00, 0x00
        ]);

        expect(reader.read(buffer)).to.be.undefined;
      });

      it('open', function() {
        var buffer = tu.newBuffer([0x00, 0x00, 0x00, 0x17,
          0x02, 0x00, 0x00, 0x00,
          0x00,
          0x53, 0x10,
          0xc0, 0x0a, 0x03,
          0xa1, 0x00,
          0xa1, 0x00,
          0x70, 0x00, 0x10, 0x00, 0x00
        ]);

        var newOpen = reader.read(buffer);
        (newOpen === undefined).should.be.false;
        newOpen.should.be.instanceof(OpenFrame);
        newOpen.maxFrameSize.should.eql(0x00100000);
      });

      it('close', function() {
        var buffer = tu.newBuffer([0x00, 0x00, 0x00, 0x0c,
          0x02, 0x00, 0x00, 0x00,
          0x00,
          0x53, 0x18, 0x45
        ]);
        var newClose = reader.read(buffer);
        (newClose === undefined).should.be.false;
        newClose.should.be.instanceof(CloseFrame);
        (newClose.error === undefined).should.be.true;
      });

      it('close (with error)', function() {
        var sizeOfError = (4 + 2 + 19 + 2 + 4 + 3);
        var sizeOfCloseFrameList = (4 + 3 + 1 + 4 + sizeOfError);
        var buffer = tu.newBuffer([0x00, 0x00, 0x00, (8 + 3 + 1 + 4 + sizeOfCloseFrameList),
          0x02, 0x00, 0x00, 0x00,
          0x00, 0x53, 0x18, // Close frame is list of error
          0xD0, builder.prototype.appendUInt32BE, sizeOfCloseFrameList, builder.prototype.appendUInt32BE, 1,
          0x00, 0x53, 0x1D, // Error
          0xD0, builder.prototype.appendUInt32BE, sizeOfError, builder.prototype.appendUInt32BE, 3,
          0xA3, 19, builder.prototype.appendString, 'amqp:internal-error',
          0xA1, 4, builder.prototype.appendString, 'test',
          0xC1, 1, 0
        ]);

        var newClose = reader.read(buffer);
        (newClose === undefined).should.be.false;
        newClose.should.be.instanceof(CloseFrame);
        newClose.error.should.be.instanceof(AMQPError);
      });

      it('begin', function() {
        var frameSize = (1 + 3 + 2 + 2 + 2 + 2);
        var buffer = tu.newBuffer([0x00, 0x00, 0x00, (8 + 3 + 2 + frameSize),
          0x02, 0x00, 0x00, 0x05,
          0x00, 0x53, 0x11, // Begin
          0xC0, frameSize, 5, // List
          0x60, builder.prototype.appendUInt16BE, 10,
          0x52, 2,
          0x52, 10,
          0x52, 11,
          0x52, 100
        ]);

        var newBegin = reader.read(buffer);
        (newBegin === undefined).should.be.false;
        newBegin.should.be.instanceof(BeginFrame);
        newBegin.channel.should.eql(5);
        newBegin.remoteChannel.should.eql(10);
        newBegin.nextOutgoingId.should.eql(2);
        newBegin.incomingWindow.should.eql(10);
        newBegin.outgoingWindow.should.eql(11);
        newBegin.handleMax.should.eql(100);
      });

      it('attach', function() {
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

        var newAttach = reader.read(buffer);
        newAttach.should.be.instanceof(AttachFrame);
        newAttach.channel.should.eql(0);
        newAttach.name.should.eql('test');
        newAttach.handle.should.eql(0);
        newAttach.role.should.eql(true);
        newAttach.senderSettleMode.should.eql(constants.senderSettleMode.mixed);
        newAttach.receiverSettleMode.should.eql(constants.receiverSettleMode.autoSettle);
      });

      it('transfer (trivial message body)', function() {
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

        var newTransfer = reader.read(buffer);
        newTransfer.should.be.instanceof(TransferFrame);
        newTransfer.channel.should.eql(channel);
        newTransfer.handle.should.eql(handle);
        newTransfer.receiverSettleMode.should.eql(constants.receiverSettleMode.autoSettle);
        newTransfer.message.body.length.should.eql(1);
        newTransfer.message.body[0].should.eql(10);
      });

      it('flow', function() {
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, 0x26,
          0x02, 0x00, 0x00, 0x01,
          0x00, 0x80, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00,
          0x00, 0x13, 0xc0, 0x12,
          0x0b, 0x43, 0x52, 0xc8,
          0x52, 0x01, 0x52, 0x64,
          0x43, 0x40, 0x52, 0x64,
          0x43, 0x42, 0x42, 0xc1,
          0x01, 0x00
        ]);

        expect(reader.read(buffer)).to.be.an.instanceOf(FlowFrame);
      });

      it('disposition', function() {
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, 0x18,
          0x02, 0x00, 0x00, 0x00,
          0x00, 0x53, 0x15, 0xc0,
          0x0b, 0x05, 0x41, 0x52,
          0x01, 0x52, 0x01, 0x41,
          0x00, 0x53, 0x24, 0x45
        ]);

        expect(reader.read(buffer)).to.be.an.instanceOf(DispositionFrame);
      });
    });

    describe('SASL frames', function() {
      it('should return undefined on incomplete buffer', function() {
        var buffer = tu.newBuffer([0x00, 0x00, 0x00, 0x17,
          0x02, 0x01, 0x00, 0x00,
          0x00,
          0x53, 0x10
        ]);
        var newOpen = reader.read(buffer);
        (newOpen === undefined).should.be.true;
      });

      it('init', function() {
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, 0x2b,
          0x02, 0x01, 0x00, 0x00,
          0x00, 0x80, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00,
          0x00, 0x41, 0xc0, 0x17,
          0x03, 0xa3, 0x05, 0x50,
          0x4c, 0x41, 0x49, 0x4e,
          0xa0, 0x0c, 0x00, 0x61,
          0x64, 0x6d, 0x69, 0x6e,
          0x00, 0x61, 0x64, 0x6d,
          0x69, 0x6e, 0x40
        ]);

        expect(reader.read(buffer)).to.be.an.instanceOf(Sasl.SaslInit);
      });

      it('mechanisms', function() {
        var arraySize = 1 + 1 + 6 + 5;
        var frameSize = 8 + 1 + 9 + 2 + 3 + arraySize;
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, frameSize,
          0x02, 0x01, 0x00, 0x00,
          0x00,
          0x80, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x40,
          0xC0, arraySize + 3, 1,
          0xE0, arraySize, 2,
          0xA3,
          5, builder.prototype.appendString, 'PLAIN',
          4, builder.prototype.appendString, 'CRAP'
        ]);
        var newMechanisms = reader.read(buffer);
        newMechanisms.should.be.instanceof(Sasl.SaslMechanisms);
        newMechanisms.mechanisms.length.should.eql(2);
        newMechanisms.mechanisms[0].should.eql('PLAIN');
        newMechanisms.mechanisms[1].should.eql('CRAP');
      });

      it('challenge', function() {
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, 0x2b,
          0x02, 0x01, 0x00, 0x00,
          0x00, 0x80, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00,
          0x00, 0x42, 0xc0, 0x17,
          0x03, 0xa3, 0x05, 0x50,
          0x4c, 0x41, 0x49, 0x4e,
          0xa0, 0x0c, 0x00, 0x61,
          0x64, 0x6d, 0x69, 0x6e,
          0x00, 0x61, 0x64, 0x6d,
          0x69, 0x6e, 0x40
        ]);

        expect(reader.read(buffer)).to.be.an.instanceOf(Sasl.SaslChallenge);
      });

      it('response', function() {
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, 0x2b,
          0x02, 0x01, 0x00, 0x00,
          0x00, 0x80, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00,
          0x00, 0x43, 0xc0, 0x17,
          0x03, 0xa3, 0x05, 0x50,
          0x4c, 0x41, 0x49, 0x4e,
          0xa0, 0x0c, 0x00, 0x61,
          0x64, 0x6d, 0x69, 0x6e,
          0x00, 0x61, 0x64, 0x6d,
          0x69, 0x6e, 0x40
        ]);

        expect(reader.read(buffer)).to.be.an.instanceOf(Sasl.SaslResponse);
      });

      it('outcome', function() {
        var buffer = tu.newBuffer([
          0x00, 0x00, 0x00, 0x10,
          0x02, 0x01, 0x00, 0x00,
          0x00, 0x53, 0x44, 0xc0,
          0x03, 0x01, 0x50, 0x00
        ]);

        expect(reader.read(buffer)).to.be.an.instanceOf(Sasl.SaslOutcome);
      });
    });

  });
});
