'use strict';
var Builder = require('buffer-builder'),
    DescribedType = require('./types/described_type'),
    AMQPFrame = require('./frames/frame').AMQPFrame,
    SaslFrame = require('./sasl').SaslFrame,
    ForcedType = require('./types/forced_type'),
    Frame = require('./frames/frame').Frame,
    TransferFrame = require('./frames/transfer_frame'),
    errors = require('./errors'),
    codec = require('./codec'),
    debug = require('debug')('amqp10:framing'),
    c = require('./constants');

var frames = module.exports = {},
    frameByCode = {};

var FrameType = { AMQP: 0x00, SASL: 0x00 };
frames.writeFrame = function(frame, stream) {
  if (!(frame instanceof Frame)) {
    throw new errors.EncodingError('unknown frame type: ' + frame.type);
  }

  var builder = new Builder();
  builder.appendUInt32BE(0); // size placeholder
  builder.appendUInt8(2);  // doff, no extended headers
  builder.appendUInt8(frame.type);
  if (frame instanceof AMQPFrame) {
    builder.appendUInt16BE(frame.channel);
  } else {
    builder.appendUInt16BE(0);
  }

  var performative = frame.toDescribedType();
  if (performative !== null && performative !== undefined) {
    debug('Encoding performative: ' + JSON.stringify(performative));
    codec.encode(performative, builder);

    if (frame instanceof TransferFrame) {
      if (frame.message !== undefined) builder.appendBuffer(frame.message);
    }
  }

  var buffer = builder.get();
  buffer.writeUInt32BE(buffer.length, 0);

  debug('sending frame: ' + frame.constructor.name + ': ' + JSON.stringify(buffer) + ': ' + buffer.toString('hex'));
  stream.write(buffer);
};

frames.readFrame = function(buffer) {
  if (buffer.length < 8) return undefined;

  var sizeAndDoff = buffer.slice(0, 8);
  var size = sizeAndDoff.readUInt32BE(0);
  if (size > buffer.length) return undefined;
  buffer.consume(8);

  var doff = sizeAndDoff[4];
  var frameType = sizeAndDoff[5];
  if (frameType !== FrameType.AMQP && frameType !== FrameType.SASL) {
    throw new errors.NotImplementedError('Unsupported frame type: ' + frameType);
  }

  var payloadSize = size - (doff * 4);
  if (payloadSize <= 0) {
    // TODO: this is probably a heartbeat frame, but what if its not?
    debug('Heartbeat frame: ' + sizeAndDoff.toString('hex'));
    return;
  }

  var xHeaderSize = (doff * 4) - 8;
  if (xHeaderSize > 0) {
    var xHeaderBuf = buffer.slice(0, xHeaderSize);
    buffer.consume(xHeaderSize);

    // @todo Process x-header
    debug('Read extended header [' + xHeaderBuf.toString('hex') + ']');
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
  // var messageBuffer = payloadBuffer.slice(decodedPayload[1]);

  var described = decodedPayload[0];
  if (!frameByCode.hasOwnProperty(described.descriptor)) {
    throw new errors.MalformedPayloadError('Unknown frame descriptor: ' + described.descriptor);
  }

  var frame =  new frameByCode[described.descriptor](described);
  frame.channel = channel;
  return frame;
};

function defineFrame(type, definition) {
  var Base = (type === FrameType.AMQP) ? AMQPFrame : SaslFrame;
  var Frame = function(values) {
    values = values || {};
    Base.call(this, values.channel);
    if (values instanceof DescribedType)
      return this.fromDescribedType(values);
    this._assignFromData(values);
  };

  Frame.prototype = Object.create(Base.prototype, {
    definition: { value: definition, enumerable: false, writable: false, configurable: false }
  });

  Frame.prototype.toDescribedType = function() {
    var value = [], _len = definition.fields.length;
    for (var i = 0; i < _len; ++i) {
      var key = definition.fields[i].name;
      if (this.hasOwnProperty(key)) {
        if (definition.fields[i].type === '*') {
          value.push(this[key]);
        } else {
          value.push(new ForcedType(definition.fields[i].type, this[key]));
        }
      } else {
        value.push(null);
      }
    }

    return new DescribedType(definition.code, value);
  };

  Frame.prototype.fromDescribedType = function(described) {
    var _len = definition.fields.length, data = described.value;
    for (var i = 0; i < _len; ++i) {
      var field = definition.fields[i];
      if (data.length > i) {
        this[field.name] = data[i];
      } else if (field.hasOwnProperty('default')) {
        this[field.name] = field.default;
      } else {
        this[field.name] = null;
      }
    }
  };

  Frame.prototype._assignFromData = function(data) {
    if (data === null || data === undefined) return;
    var _len = definition.fields.length;
    for (var i = 0; i < _len; ++i) {
      var field = definition.fields[i];
      if (data.hasOwnProperty(field.name)) {
        this[field.name] = data[field.name];
      } else if (field.hasOwnProperty('default')) {
        this[field.name] = field.default;
      }
    }
  };

  frameByCode[definition.code] = Frame;
  frames[definition.name] = Frame;
  return Frame;
}

// var framesByDescriptor = {};
// function defineFrame(type, definition) {
//   var Frame = types.defineComposite(definition);
//   frames[definition.name] = Frame.create;
//   framesByDescriptor[Frame.descriptor.code] = Frame;
//   framesByDescriptor[Frame.descriptor.name] = Frame;
// }

// FRAMES
defineFrame(FrameType.AMQP, {
  name: 'open', code: 0x10,
  fields: [
    { name: 'containerId', type: 'string', mandatory: true },
    { name: 'hostname', type: 'string' },
    { name: 'maxFrameSize', type: 'uint', default: 4294967295 },
    { name: 'channelMax', type: 'ushort', default: 65535 },
    { name: 'idleTimeOut', type: 'uint', default: c.defaultIdleTimeout },
    { name: 'outgoingLocales', type: 'symbol', multiple: true, default: c.defaultOutgoingLocales },
    { name: 'incomingLocales', type: 'symbol', multiple: true, default: c.defaultIncomingLocales },
    { name: 'offeredCapabilities', type: 'symbol', multiple: true },
    { name: 'desiredCapabilities', type: 'symbol', multiple: true },
    { name: 'properties', type: 'map', default: {} }
  ]
});

defineFrame(FrameType.AMQP, {
  name: 'begin', code: 0x11,
  fields: [
    { name: 'remoteChannel', type: 'ushort' },
    { name: 'nextOutgoingId', type: 'uint', mandatory: true },
    { name: 'incomingWindow', type: 'uint', mandatory: true },
    { name: 'outgoingWindow', type: 'uint', mandatory: true },
    { name: 'handleMax', type: 'uint', default:4294967295 },
    { name: 'offeredCapabilities', type: 'symbol', multiple: true },
    { name: 'desiredCapabilities', type: 'symbol', multiple: true },
    { name: 'properties', type: 'map', default: {} }
  ]
});

defineFrame(FrameType.AMQP, {
  name: 'attach', code: 0x12,
  fields: [
    { name: 'name', type: 'string', mandatory: true },
    { name: 'handle', type: 'uint', mandatory: true },
    { name: 'role', type: 'boolean', mandatory: true },
    { name: 'sndSettleMode', type: 'ubyte', default: 2 },
    { name: 'rcvSettleMode', type: 'ubyte', default: 0 },
    { name: 'source', type: '*' },
    { name: 'target', type: '*' },
    { name: 'unsettled', type: 'map' },
    { name: 'incompleteUnsettled', type: 'boolean', default: false },
    { name: 'initialDeliveryCount', type: 'uint' },
    { name: 'maxMessageSize', type: 'ulong' },
    { name: 'offeredCapabilities', type: 'symbol', multiple: true },
    { name: 'desiredCapabilities', type: 'symbol', multiple: true },
    { name: 'properties', type: 'map', default: {} }
  ]
});

defineFrame(FrameType.AMQP, {
  name: 'flow', code: 0x13,
  fields: [
    { name:'nextIncomingId', type: 'uint' },
    { name:'incomingWindow', type: 'uint', mandatory: true },
    { name:'nextOutgoingId', type: 'uint', mandatory: true },
    { name:'outgoingWindow', type: 'uint', mandatory: true },
    { name:'handle', type: 'uint' },
    { name:'deliveryCount', type: 'uint' },
    { name:'linkCredit', type: 'uint' },
    { name:'available', type: 'uint' },
    { name:'drain', type: 'boolean', default: false },
    { name:'echo', type: 'boolean', default: false },
    { name:'properties', type: 'map', default: {} }
  ]
});

defineFrame(FrameType.AMQP, {
  name: 'detach', code: 0x16,
  fields: [
    { name: 'handle', type: 'uint', mandatory: true },
    { name: 'closed', type: 'boolean', default: false },
    { name: 'error', type: 'error' }
  ]
});

defineFrame(FrameType.AMQP, {
  name: 'end', code: 0x17,
  fields: [
    { name: 'error', type: 'error' }
  ]
});

defineFrame(FrameType.AMQP, {
  name: 'close', code: 0x18,
  fields: [
    { name: 'error', type: 'error' }
  ]
});
