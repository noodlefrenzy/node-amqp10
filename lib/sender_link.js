'use strict';

var _ = require('lodash'),
    util = require('util'),
    debug = require('debug')('amqp10:link:sender'),

    errors = require('./errors'),
    constants = require('./constants'),

    TransferFrame = require('./frames/transfer_frame'),

    Link = require('./link');

function SenderLink(session, handle, linkPolicy) {
  SenderLink.super_.call(this, session, handle, linkPolicy);
}
util.inherits(SenderLink, Link);

// public API
SenderLink.prototype.canSend = function() {
  var sendable = (this.linkCredit >= 1 && (!this.session.policy.enableSessionFlowControl || this.session._sessionParams.remoteIncomingWindow >= 1));
  debug('canSend(' + this.linkCredit + ',' + this.session._sessionParams.remoteIncomingWindow + ') = ' + sendable);
  return sendable;
};

SenderLink.prototype.sendMessage = function(message, options) {
  return this.session.sendMessage(this, message, options);
};

// private API
SenderLink.prototype._sendMessage = function(messageId, message, transferOptions) {
  if (this.linkCredit <= 0) {
    throw new errors.OverCapacityError('Cannot send if no link credit.');
  }

  transferOptions = transferOptions || {};
  var options = _.defaults(transferOptions, {
    channel: this.session.channel,
    handle: this.handle,
    deliveryId: messageId,
    settled: this.session._sessionParams.senderSettleMode === constants.senderSettleMode.settled,
    message: message
  });

  this.linkCredit--;
  this.session.connection.sendFrame(new TransferFrame(options));
  return messageId;
};

SenderLink.prototype._flowReceived = function(flowFrame) {
  if (flowFrame.handle !== null) {
    this.available = flowFrame.available;
    this.deliveryCount = flowFrame.deliveryCount;
    this.linkCredit = flowFrame.linkCredit;
    this.totalCredits += flowFrame.linkCredit;

    debug('setting credits (' + this.linkCredit + ',' + this.session._sessionParams.remoteIncomingWindow + ')');
  }

  this.emit(Link.CreditChange, this);
};

module.exports = SenderLink;
