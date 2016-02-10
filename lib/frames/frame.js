'use strict';
var util = require('util'),
    constants = require('./../constants'),
    errors = require('./../errors');

function Frame(type) {
  this.type = type;
}

Frame.prototype.fromDescribedType = function(describedType) {
  throw new errors.NotImplementedError('Subclasses of AMQPrame must implement `fromDescribedType`');
};

Frame.prototype.toDescribedType = function() { return null; };
module.exports.Frame = Frame;

function AMQPFrame(channel) {
  AMQPFrame.super_.call(this, constants.frameType.amqp);
  this.channel = channel || 0;
}

util.inherits(AMQPFrame, Frame);

AMQPFrame.prototype.toDescribedType = function() {
  throw new errors.NotImplementedError('Children of AMQPFrame must implement `toDescribedType`');
};

module.exports.AMQPFrame = AMQPFrame;

function SaslFrame() {
  SaslFrame.super_.call(this, constants.frameType.sasl);
}

util.inherits(SaslFrame, Frame);
module.exports.SaslFrame = SaslFrame;
