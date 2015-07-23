'use strict';
var SenderLink = require('../../../lib/sender_link'),
    util = require('util');

function MockSenderLink(session, options) {
  MockSenderLink.super_.call(this, session, null, {
    encoder: function(body) { return body; }
  });

  this._created = 0;
  this.session = session;
  this.options = options;
  this._clearState();
}

util.inherits(MockSenderLink, SenderLink);

MockSenderLink.prototype.canSend = function() {
  this.emit('canSend-called', this);
  return this.capacity > 0;
};

MockSenderLink.prototype._sendMessage = function(msg, options) {
  var self = this;
  self.curId++;
  self.messages.push({ id: self.curId, message: msg.body[0], options: options });
  self.emit('sendMessage-called', self, self.curId, msg, options);
  return self.curId;
};

MockSenderLink.prototype._clearState = function() {
  this.name = this.options.name;
  this.isSender = this.options.isSender || false;
  this.capacity = this.options.capacity || 0;
  this.messages = [];
  this.curId = 0;
};

module.exports = MockSenderLink;
