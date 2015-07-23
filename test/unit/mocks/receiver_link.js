'use strict';
var EventEmitter = require('events').EventEmitter,
    util = require('util');

function MockReceiverLink(session, options) {
  this._created = 0;
  this.session = session;
  this.options = options;
  this._clearState();
}

util.inherits(MockReceiverLink, EventEmitter);

MockReceiverLink.prototype._clearState = function() {
  this.name = this.options.name;
  this.isSender = this.options.isSender || false;
  this.capacity = this.options.capacity || 0;
  this.messages = [];
  this.curId = 0;
};

module.exports = MockReceiverLink;
