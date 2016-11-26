'use strict';
var Builder = require('buffer-builder'),
    DescribedType = require('./types/described_type'),
    errors = require('./errors'),
    codec = require('./codec'),
    debug = require('debug')('amqp10:framing'),
    trace = require('debug')('amqp10:trace'),
    constants = require('./constants'),
    defineComposite = require('./types/composite_type').defineComposite,
    terminus = require('./types/terminus'),
    util = require('util');

var frames = module.exports = {};
var framesByDescriptor = {};

var FrameType = { AMQP: 0x00, SASL: 0x01 };
frames.Frame = function(type) { this.type = type; };
frames.AMQPFrame = function(channel) {
  frames.AMQPFrame.super_.call(this, constants.frameType.amqp);
  this.channel = channel || 0;
};
util.inherits(frames.AMQPFrame, frames.Frame);

frames.SaslFrame = function() {
  frames.SaslFrame.super_.call(this, constants.frameType.sasl);
};
util.inherits(frames.SaslFrame, frames.Frame);

frames.writeFrame = function(frame, stream, callback) {
  if (!(frame instanceof frames.Frame)) {
    throw new errors.EncodingError(frame, 'unknown frame type');
  }

  var builder = new Builder();
  builder.appendUInt32BE(0); // size placeholder
  builder.appendUInt8(2);  // doff, no extended headers
  builder.appendUInt8(frame.type);
  if (frame instanceof frames.AMQPFrame) {
    builder.appendUInt16BE(frame.channel);
  } else {
    builder.appendUInt16BE(0);
  }

  var performative = frame.toDescribedType();
  if (performative !== null && performative !== undefined) {
    codec.encode(performative, builder);
    if (frame instanceof frames.TransferFrame) {
      if (frame.payload !== undefined) builder.appendBuffer(frame.payload);
    }
  }

  var buffer = builder.get();
  buffer.writeUInt32BE(buffer.length, 0);
  debug('sending frame: ', frame);
  trace('raw: [' + buffer.toString('hex') + ']');
  stream.write(buffer, callback);
};

frames.readFrame = function(buffer) {
  if (buffer.length < 8) return undefined;

  var sizeAndDoff = buffer.slice(0, 8);
  var size = sizeAndDoff.readUInt32BE(0);
  var doff = sizeAndDoff.readUInt8(4);
  if (doff !== 2) throw new errors.MalformedHeaderError('Invalid DOFF');
  if (size > buffer.length) return undefined;

  var frameType = sizeAndDoff[5];
  if (frameType !== FrameType.AMQP && frameType !== FrameType.SASL) {
    throw new errors.NotImplementedError('Unsupported frame type: ' + frameType);
  }

  // actually consume the bytes now that we have no errors
  buffer.consume(8);

  var payloadSize = size - (doff * 4);
  if (payloadSize <= 0) {
    // @todo: this is probably a heartbeat frame, but what if its not?
    debug('received frame: (EMPTY FRAME)');
    trace('raw: [' + sizeAndDoff.toString('hex') + ']');
    return;
  }

  var xHeaderSize = (doff * 4) - 8;
  if (xHeaderSize > 0) {
    var xHeaderBuf = buffer.slice(0, xHeaderSize);
    buffer.consume(xHeaderSize);

    // @todo: Process x-header
    debug('received extended header');
    trace('raw: [' + xHeaderBuf.toString('hex') + ']');
  }

  // read payload
  var payloadBuffer = buffer.slice(0, payloadSize);
  buffer.consume(payloadSize);

  // decode payload
  var decodedPayload = codec.decode(payloadBuffer, 0);
  if (!decodedPayload) {
    throw new errors.MalformedPayloadError('Unable to parse frame payload [' + payloadBuffer.toString('hex') + ']');
  }

  if (!(decodedPayload[0] instanceof DescribedType)) {
    throw new errors.MalformedPayloadError('Expected DescribedType from AMQP Payload, but received ' + JSON.stringify(decodedPayload[0]));
  }

  // read frame
  var channel = sizeAndDoff.readUInt16BE(6); // Bytes 6 & 7 are channel
  var messageBuffer = payloadBuffer.slice(decodedPayload[1]);

  var described = decodedPayload[0];
  if (!framesByDescriptor.hasOwnProperty(described.descriptor)) {
    throw new errors.MalformedPayloadError('Unknown frame descriptor: ' + described.descriptor);
  }

  var frame = new framesByDescriptor[described.descriptor](described);
  if (messageBuffer.length) frame.payload = messageBuffer;
  if (frameType === FrameType.AMQP) {
    frame.channel = channel;
  }

  debug('received frame: ', frame);
  trace('raw: [' + payloadBuffer.toString('hex') + ']');
  return frame;
};

function defineFrame(type, definition) {
  var FrameBase = (type === FrameType.AMQP) ? frames.AMQPFrame : frames.SaslFrame;
  var Frame = defineComposite(FrameBase, definition);
  framesByDescriptor[Frame.descriptor.code] = Frame;
  framesByDescriptor[Frame.descriptor.name] = Frame;
  return Frame;
}

// restricted type helpers
function role(value) {
  if (typeof value === 'boolean')
    return value;

  if (value !== 'sender' && value !== 'receiver')
    throw new errors.EncodingError(value, 'invalid role');
  return (value === 'sender') ? false : true;
}

var ReceiverSettleModes = [ 'first', 'second', 'auto', 'settle' ];
function receiverSettleMode(value) {
  if (typeof value === 'number' || value instanceof Number)
    return value;

  if (ReceiverSettleModes.indexOf(value) === -1)
    throw new errors.EncodingError(value, 'invalid receiver settle mode');
  return (value === 'first' || value === 'auto') ? 0 : 1;
}

function senderSettleMode(value) {
  if (typeof value === 'number' || value instanceof Number)
    return value;

  if (value !== 'unsettled' && value !== 'settled' && value !== 'mixed')
    throw new errors.EncodingError(value, 'invalid sender settle mode');

  if (value === 'unsettled') return 0;
  else if (value === 'settled') return 1;
  return 2;
}

// AMQP frames
frames.OpenFrame = defineFrame(FrameType.AMQP, {
  name: 'open', code: 0x10,
  fields: [
    { name: 'containerId', type: 'string', mandatory: true },
    { name: 'hostname', type: 'string' },
    { name: 'maxFrameSize', type: 'uint', default: constants.defaultMaxFrameSize },
    { name: 'channelMax', type: 'ushort', default: constants.defaultChannelMax },
    { name: 'idleTimeout', type: 'milliseconds', default: constants.defaultIdleTimeout },
    { name: 'outgoingLocales', type: 'ietf-language-tag',
      multiple: true, default: constants.defaultOutgoingLocales },
    { name: 'incomingLocales', type: 'ietf-language-tag',
      multiple: true, default: constants.defaultIncomingLocales },
    { name: 'offeredCapabilities', type: 'symbol', multiple: true },
    { name: 'desiredCapabilities', type: 'symbol', multiple: true },
    { name: 'properties', type: 'fields', default: {} }
  ]
});

frames.BeginFrame = defineFrame(FrameType.AMQP, {
  name: 'begin', code: 0x11,
  fields: [
    { name: 'remoteChannel', type: 'ushort' },
    { name: 'nextOutgoingId', type: 'transfer-number', mandatory: true },
    { name: 'incomingWindow', type: 'uint', mandatory: true },
    { name: 'outgoingWindow', type: 'uint', mandatory: true },
    { name: 'handleMax', type: 'handle', default: constants.defaultHandleMax },
    { name: 'offeredCapabilities', type: 'symbol', multiple: true },
    { name: 'desiredCapabilities', type: 'symbol', multiple: true },
    { name: 'properties', type: 'fields', default: {} }
  ]
});

frames.AttachFrame = defineFrame(FrameType.AMQP, {
  name: 'attach', code: 0x12,
  fields: [
    { name: 'name', type: 'string', mandatory: true },
    { name: 'handle', type: 'handle', mandatory: true },
    { name: 'role', type: 'boolean', requires: role, mandatory: true },
    { name: 'sndSettleMode', type: 'ubyte', requires: senderSettleMode, default: 'mixed' },
    { name: 'rcvSettleMode', type: 'ubyte', requires: receiverSettleMode, default: 'auto' },
    { name: 'source', type: '*', requires: terminus.Source },
    { name: 'target', type: '*', requires: terminus.Target },
    { name: 'unsettled', type: 'map', default: {} },
    { name: 'incompleteUnsettled', type: 'boolean', default: false },
    { name: 'initialDeliveryCount', type: 'sequence-no' },
    { name: 'maxMessageSize', type: 'ulong', default: 0 },
    { name: 'offeredCapabilities', type: 'symbol', multiple: true },
    { name: 'desiredCapabilities', type: 'symbol', multiple: true },
    { name: 'properties', type: 'fields', default: {} }
  ]
});

frames.FlowFrame = defineFrame(FrameType.AMQP, {
  name: 'flow', code: 0x13,
  fields: [
    { name:'nextIncomingId', type: 'transfer-number' },
    { name:'incomingWindow', type: 'uint', mandatory: true },
    { name:'nextOutgoingId', type: 'transfer-number', mandatory: true },
    { name:'outgoingWindow', type: 'uint', mandatory: true },
    { name:'handle', type: 'handle' },
    { name:'deliveryCount', type: 'sequence-no' },
    { name:'linkCredit', type: 'uint' },
    { name:'available', type: 'uint' },
    { name:'drain', type: 'boolean', default: false },
    { name:'echo', type: 'boolean', default: false },
    { name:'properties', type: 'fields', default: {} }
  ]
});

frames.TransferFrame = defineFrame(FrameType.AMQP, {
  name: 'transfer', code: 0x14,
  fields:[
    { name: 'handle', type: 'handle', mandatory: true },
    { name: 'deliveryId', type: 'delivery-number' },
    { name: 'deliveryTag', type: 'delivery-tag' },
    { name: 'messageFormat', type: 'message-format', default: 0 },
    { name: 'settled', type: 'boolean' },
    { name: 'more', type: 'boolean', default: false },
    { name: 'rcvSettleMode', type: 'ubyte', requires: receiverSettleMode, default: 'auto' },
    { name: 'state', type: '*' /* @todo: requires: deliveryState */ },
    { name: 'resume', type: 'boolean', default: false },
    { name: 'aborted', type: 'boolean', default: false },
    { name: 'batchable', type: 'boolean', default: false }
  ]
});

frames.DispositionFrame = defineFrame(FrameType.AMQP, {
  name: 'disposition', code: 0x15,
  fields:[
    { name: 'role', type: 'boolean', requires: role, mandatory: true },
    { name: 'first', type: 'delivery-number', mandatory: true },
    { name: 'last', type: 'delivery-number' },
    { name: 'settled', type: 'boolean', default: false },
    { name: 'state', type: '*' /* @todo: requires: deliveryState */ },
    { name: 'batchable', type: 'boolean', default: false }
  ]
});

frames.DetachFrame = defineFrame(FrameType.AMQP, {
  name: 'detach', code: 0x16,
  fields: [
    { name: 'handle', type: 'handle', mandatory: true },
    { name: 'closed', type: 'boolean', default: false },
    { name: 'error', type: 'error' }
  ]
});

frames.EndFrame = defineFrame(FrameType.AMQP, {
  name: 'end', code: 0x17,
  fields: [
    { name: 'error', type: 'error' }
  ]
});

frames.CloseFrame = defineFrame(FrameType.AMQP, {
  name: 'close', code: 0x18,
  fields: [
    { name: 'error', type: 'error' }
  ]
});

// SASL frames
frames.SaslMechanismsFrame = defineFrame(FrameType.SASL, {
  name: 'sasl-mechanisms', code: 0x40,
  fields: [
    { name: 'saslServerMechanisms', type: 'symbol', multiple: true, mandatory: true }
  ]
});

frames.SaslInitFrame = defineFrame(FrameType.SASL, {
  name: 'sasl-init', code: 0x41,
  fields: [
    { name: 'mechanism', type: 'symbol', mandatory: true },
    { name: 'initialResponse', type: 'binary' },
    { name: 'hostname', type: 'string' }
  ]
});

frames.SaslChallengeFrame = defineFrame(FrameType.SASL, {
  name: 'sasl-challenge', code: 0x42,
  fields: [
    { name: 'challenge', type: 'binary', mandatory: true }
  ]
});

frames.SaslResponseFrame = defineFrame(FrameType.SASL, {
  name: 'sasl-response', code: 0x43,
  fields: [
    { name: 'response', type: 'binary', mandatory: true }
  ]
});

frames.SaslOutcomeFrame = defineFrame(FrameType.SASL, {
  name: 'sasl-outcome', code: 0x44,
  fields: [
    { name: 'code', type: 'ubyte', mandatory: true },
    { name: 'additionalData', type: 'binary' }
  ]
});

// special frames
frames.HeartbeatFrame = function() {
  frames.AMQPFrame.call(this, 0);
};
frames.HeartbeatFrame.prototype = Object.create(frames.AMQPFrame.prototype);
frames.HeartbeatFrame.prototype.toDescribedType = function() { return null; };
frames.HeartbeatFrame.prototype.inspect = function(depth) {
  return '(EMPTY FRAME)';
};

// used to determine if a message should be split to multiple frames
frames.TRANSFER_FRAME_OVERHEAD = 29;
