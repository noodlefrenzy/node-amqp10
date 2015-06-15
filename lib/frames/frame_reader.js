'use strict';

var debug = require('debug')('amqp10:framing:reader'),

    _ = require('lodash'),
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

    DescribedType = require('../types/described_type'),
    M = require('../types/message');

function FrameReaderBase() {
  this._registry = {};
}

FrameReaderBase.prototype._registerFrameType = function(FrameType) {
  this._registry[FrameType.Descriptor.code.toString()] = FrameType;
  this._registry[FrameType.Descriptor.name.toString()] = FrameType;
};

FrameReaderBase.prototype._readFrame = function(channel, describedType, buffer) {
  var descriptor = describedType.descriptor.toString();
  if (!_.has(this._registry, descriptor)) {
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
    frame.message = readAmqpMessage(buffer);
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
 * An AMQP Message is composed of:
 *
 * * Zero or one header
 * * Zero or one delivery-annotations
 * * Zero or one message-annotations
 * * Zero or one properties
 * * Zero or one application-properties
 * * Body: One or more data sections, one or more amqp-sequence sections, or one amqp-value section
 * * Zero or one footer
 *
 * @param {Buffer} buffer          Message buffer to decode
 * @return {Message}               Complete message object decoded from buffer
 * @private
 */
function readAmqpMessage(buffer) {
  var message = new M.Message();
  var body = [];
  var curIdx = 0;
  var possibleFields = {
    'header': M.Header, 'footer': M.Footer, 'deliveryAnnotations': M.DeliveryAnnotations,
    'annotations': M.Annotations, 'properties': M.Properties, 'applicationProperties': M.ApplicationProperties
  };
  var isData = function(x) { return x instanceof M.Data; };
  var isSequence = function(x) { return x instanceof M.AMQPSequence; };
  while (curIdx < buffer.length) {
    var decoded = codec.decode(buffer, curIdx);
    if (!decoded) throw new errors.MalformedPayloadError(
        'Unable to decode bytes from message body: ' + buffer.slice(curIdx).toString('hex'));
    curIdx += decoded[1];
    var matched = false;
    for (var fieldName in possibleFields) {
      if (decoded[0] instanceof possibleFields[fieldName]) {
        if (message[fieldName]) throw new errors.MalformedPayloadError('Duplicate ' + fieldName + ' section in message');
        message[fieldName] = decoded[0];
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Part of the body
      if (decoded[0] instanceof M.Data) {
        if (body.length && !body.every(isData)) throw new errors.MalformedPayloadError(
            'Attempt to put both Data and non-Data payloads in message body');
        body.push(decoded[0]);
      } else if (decoded[0] instanceof M.AMQPSequence) {
        if (body.length && !body.every(isSequence)) throw new errors.MalformedPayloadError(
            'Attempt to put both AMQPSequence and non-AMQPSequence payloads in message body');
        body.push(decoded[0]);
      } else if (decoded[0] instanceof M.AMQPValue) {
        if (body.length) throw new errors.MalformedPayloadError('Attempt to provide more than one AMQPValue for message body');
        body.push(decoded[0]);
      } else {
        throw new errors.MalformedPayloadError('Unknown message contents: ' + JSON.stringify(decoded[0]));
      }
    }
  }
  // Pull out the values.
  message.body = body.map(function(x) { return x.getValue(); });

  return message;
}



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

  var size = buffer.slice(0, 4).readUInt32BE(0);
  if (size > buffer.length) return undefined;

  var sizeAndDoff = buffer.slice(0, 8);
  buffer.consume(8);

  var doff = sizeAndDoff[4];
  var frameType = sizeAndDoff[5];
  if (!_.has(this._frameReaders, frameType)) {
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
