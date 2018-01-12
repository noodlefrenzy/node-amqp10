'use strict';
var frames = require('../frames'),
    Builder = require('buffer-builder'),
    Promise = require('bluebird');

function SaslPlain (user, password) {
  this._user = user;
  this._password = password;
}

SaslPlain.prototype.getInitFrame = function () {
  var self = this;
  return new Promise(function(resolve) {
    var buf = new Builder();
    buf.appendUInt8(0); // <null>
    buf.appendString(self._user);
    buf.appendUInt8(0); // <null>
    buf.appendString(self._password);

    var initFrame = new frames.SaslInitFrame({
      mechanism: 'PLAIN',
      initialResponse: buf.get()
    });

    resolve(initFrame);
  });
};

SaslPlain.prototype.getChallengeResponse = function (frame) {
  return new Promise(function(resolve) {
    resolve(new frames.SaslResponseFrame({}));
  });
};

module.exports = SaslPlain;