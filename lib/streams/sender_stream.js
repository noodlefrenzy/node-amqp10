'use strict';
var Writable = require('stream').Writable,
    util = require('util');

function SenderStream(link, options) {
  Writable.call(this, { objectMode: true });
  this._link = link;
}
util.inherits(SenderStream, Writable);

SenderStream.prototype._write = function(chunk, encoding, callback) {
  // this is much faster, but involves no checks
  this._link.send(chunk);
  callback();

  // this is mega-slow, but might be desired functionality
  // this._link.send(chunk).then(function() { callback(); });
};

module.exports = SenderStream;
