'use strict';
var Promise = require('bluebird'),
    Writable = require('stream').Writable,
    util = require('util');

function SenderStream(link, options) {
  Writable.call(this, { objectMode: true });

  options = options || {};
  this._noReply = options.hasOwnProperty('noReply') ? !!options.noReply : false;
  this._link = link;
}
util.inherits(SenderStream, Writable);

SenderStream.prototype._write = function(chunk, encoding, callback) {
  var promise = this._link.send(chunk, { noReply: this._noReply });
  if (!(promise instanceof Promise)) return callback();

  return promise
    .then(function() { callback(); })
    .error(function(err) { callback(err); });
};

module.exports = SenderStream;
