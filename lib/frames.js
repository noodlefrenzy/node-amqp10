'use strict';
var Builder = require('buffer-builder'),
    AMQPFrame = require('./frames/frame').AMQPFrame,
    Frame = require('./frames/frame').Frame,
    errors = require('./errors'),
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

  // TODO: break this out
  frame._writePayload(builder);

  var buffer = builder.get();
  buffer.writeUInt32BE(buffer.length, 0);

  debug('sending frame: ' + frame.constructor.name + ': ' + JSON.stringify(buffer) + ': ' + buffer.toString('hex'));
  stream.write(buffer);
};
