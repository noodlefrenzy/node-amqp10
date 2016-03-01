'use strict';
var Readable = require('stream').Readable,
    util = require('util');

function ReceiverStream(link, options) {
  var highWaterMark = link.policy.creditQuantum || 16;
  Readable.call(this, { objectMode: true, highWaterMark: highWaterMark });
  this._link = link;
  this._increasing = false;

  link.on('message', this._processMessage.bind(this));
  link.on('detached', this._haltProcessing.bind(this));
  link.on('errorReceived', this._haltProcessing.bind(this));
  link.on('creditChange', this._creditChange.bind(this));
}
util.inherits(ReceiverStream, Readable);

ReceiverStream.prototype._read = function(size) {
  if (this._link.linkCredit <= 0 && !this._increasing) {
    return this._link.addCredits(size);
  }
};

ReceiverStream.prototype._processMessage = function(message) {
  if (!this.push(message)) {
    return this._link.flow({ linkCredit: 0 });
  }
};

ReceiverStream.prototype._haltProcessing = function() {
  this.push(null);
};

ReceiverStream.prototype._creditChange = function(credits) {
  this._increasing = false;
};

module.exports = ReceiverStream;
