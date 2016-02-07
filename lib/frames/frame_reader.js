'use strict';

var debug = require('debug')('amqp10:framing:reader'),
    util = require('util'),

    Attach = require('./attach_frame'),
    Begin = require('./begin_frame'),
    Close = require('./close_frame'),
    Detach = require('./detach_frame'),
    Disposition = require('./disposition_frame'),
    End = require('./end_frame'),
    Flow = require('./flow_frame'),
    Open = require('./open_frame'),
    Transfer = require('./transfer_frame'),

    Sasl = require('./sasl_frame'),

    codec = require('../codec'),
    constants = require('../constants'),
    errors = require('../errors'),

    DescribedType = require('../types/described_type');

function FrameReaderBase() {
  this._registry = {};
}

FrameReaderBase.prototype._registerFrameType = function(FrameType) {
  this._registry[FrameType.prototype.Descriptor.code] = FrameType;
  this._registry[FrameType.prototype.Descriptor.name] = FrameType;
};

FrameReaderBase.prototype._readFrame = function(channel, describedType, buffer) {
  var descriptor = describedType.descriptor;
  if (!this._registry.hasOwnProperty(descriptor)) {
    debug('Failed to match descriptor ' + descriptor);
    throw new errors.MalformedPayloadError('Failed to match frame: ' + descriptor);
  }

  return new this._registry[descriptor](describedType);
};

function AmqpFrameReader() {
  AmqpFrameReader.super_.call(this);
  this._registerFrameType(Open);
  this._registerFrameType(Close);
  this._registerFrameType(Begin);
  this._registerFrameType(End);
  this._registerFrameType(Attach);
  this._registerFrameType(Detach);
  this._registerFrameType(Flow);
  this._registerFrameType(Transfer);
  this._registerFrameType(Disposition);
}
util.inherits(AmqpFrameReader, FrameReaderBase);

AmqpFrameReader.prototype.read = function(channel, describedType, buffer) {
  //debug('Rx on channel '+channel+': ' + JSON.stringify(describedType));
  var frame = this._readFrame(channel, describedType, buffer);
  frame.channel = channel;
  if (frame instanceof Transfer)
    frame.message = buffer;
  return frame;
};

function SaslFrameReader() {
  SaslFrameReader.super_.call(this);
  this._registerFrameType(Sasl.SaslInit);
  this._registerFrameType(Sasl.SaslMechanisms);
  this._registerFrameType(Sasl.SaslChallenge);
  this._registerFrameType(Sasl.SaslResponse);
  this._registerFrameType(Sasl.SaslOutcome);
}
util.inherits(SaslFrameReader, FrameReaderBase);

SaslFrameReader.prototype.read = function(channel, describedType, buffer) {
  // NOTE: channel is ignored for SASL frames
  debug('Rx SASL Frame: ' + JSON.stringify(describedType));
  return this._readFrame(channel, describedType, buffer);
};

/**
 *
 * @constructor
 */
function FrameReader() {
  this._frameReaders = {};
  this._frameReaders[constants.frameType.amqp] = new AmqpFrameReader();
  this._frameReaders[constants.frameType.sasl] = new SaslFrameReader();
}

/**
 * For now, just process performative headers.
 * @todo Need to process the payloads as well
 * @todo Cope with Non-AMQP frames
 *
 * @param buffer       Buffer containing the potential frame data.
 * @return {AMQPFrame} Frame with populated data, undefined if frame is incomplete.  Throws exception on unmatched frame.
 */
FrameReader.prototype.read = function(buffer) {
  if (buffer.length < 8) return undefined;

  var sizeAndDoff = buffer.slice(0, 8);
  var size = sizeAndDoff.readUInt32BE(0);
  if (size > buffer.length) return undefined;
  buffer.consume(8);

  var doff = sizeAndDoff[4];
  var frameType = sizeAndDoff[5];
  if (!this._frameReaders.hasOwnProperty(frameType)) {
    throw new errors.NotImplementedError("Unsupported frame type: " + frameType);
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
  var messageBuffer = payloadBuffer.slice(decodedPayload[1]);
  return this._frameReaders[frameType].read(channel, decodedPayload[0], messageBuffer);
};

module.exports = new FrameReader();
