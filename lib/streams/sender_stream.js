'use strict';
var Writable = require('stream').Writable,
    util = require('util');

function SenderStream(link, options) {
  Writable.call(this, { objectMode: true });
  this._link = link;
}
util.inherits(SenderStream, Writable);

SenderStream.prototype._write = function(chunk, encoding, callback) {
  return this._link.send(chunk)
    .then(function() { callback(); })
    .error(function(err) { callback(err); });
};

module.exports = SenderStream;
