'use strict';
var Link = require('../../../lib/link'),
    ReceiverLink = require('../../../lib/receiver_link'),

    util = require('util');

function MockReceiverLink(session, options) {
  MockReceiverLink.super_.call(this);

  this._created = 0;
  this.session = session;
  this.options = options;
  this._clearState();
}

util.inherits(MockReceiverLink, ReceiverLink);

MockReceiverLink.prototype._clearState = function() {
  this.name = this.options.name;
  this.isSender = this.options.isSender || false;
  this.capacity = this.options.capacity || 0;
  this.messages = [];
  this.curId = 0;
};

MockReceiverLink.prototype.simulateAttaching = function() {
  this.linkSM.sendAttach();
  this.linkSM.attachReceived();
  this.emit(Link.Attached, this);
  this._resolveAttachPromises(null, this);
};


module.exports = MockReceiverLink;
