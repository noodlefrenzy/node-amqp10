'use strict';
var Promise = require('bluebird'),
    frames = require('../frames'),
    Builder = require('buffer-builder');

function SaslAnonymous () {

}

SaslAnonymous.prototype.getInitFrame = function() {
  return new Promise(function(resolve) {
    var buf = new Builder();
    buf.appendUInt8(0); // <null>

    var initFrame = new frames.SaslInitFrame({
      mechanism: 'ANONYMOUS',
      initialResponse: buf.get()
    });

    resolve(initFrame);
  });
};

SaslAnonymous.prototype.getChallengeResponse = function (frame) {
  return new Promise(function(resolve) {
    resolve(new frames.SaslResponseFrame({}));
  });
};

module.exports = SaslAnonymous;