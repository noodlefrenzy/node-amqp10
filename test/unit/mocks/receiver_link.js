'use strict';
var Link = require('../../../lib/link'),
    ReceiverLink = require('../../../lib/receiver_link'),
    Policy = require('../../../lib/policies/policy'),
    putils = require('../../../lib/policies/policy_utilities'),
    util = require('util');

function MockReceiverLink(session, options, policyOverrides) {
  var linkPolicy = putils.Merge(policyOverrides, (new Policy()).senderLink);
  MockReceiverLink.super_.call(this, session, null, linkPolicy);

  this._created = 0;
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
  this.sm.sendAttach();
  this.sm.attachReceived();
  this.emit(Link.Attached, this);
  this._resolveAttachPromises(null, this);
};


module.exports = MockReceiverLink;
