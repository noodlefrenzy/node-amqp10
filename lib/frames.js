'use strict';
var Builder = require('buffer-builder'),
    AMQPFrame = require('./frames/frame').AMQPFrame,
    Frame = require('./frames/frame').Frame,
    TransferFrame = require('./frames/transfer_frame'),
    errors = require('./errors'),
    codec = require('./codec'),
    debug = require('debug')('amqp10:framing');

var frames = module.exports = {};

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
