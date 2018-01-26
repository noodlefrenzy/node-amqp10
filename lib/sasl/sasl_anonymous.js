'use strict';
var Builder = require('buffer-builder'),
    Promise = require('bluebird');

function SaslAnonymous () {}

SaslAnonymous.prototype.getInitFrame = function() {
  var buf = new Builder();
  buf.appendUInt8(0); // <null>
  return Promise.resolve({
    mechanism: 'ANONYMOUS',
    initialResponse: buf.get()
  });
};

module.exports = SaslAnonymous;