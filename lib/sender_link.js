'use strict';

var _ = require('lodash'),
    Promise = require('bluebird'),
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
SenderLink.prototype.attach = function() {
  this.initialDeliveryCount = this.policy.options.initialDeliveryCount;
  this.deliveryCount = 0;

  // call super method
  SenderLink.super_.prototype.attach.call(this);
};


SenderLink.prototype.canSend = function() {
  var sendable = (this.linkCredit >= 1 && (!this.session.policy.enableSessionFlowControl || this.session._sessionParams.remoteIncomingWindow >= 1));
  debug('canSend(' + this.linkCredit + ',' + this.session._sessionParams.remoteIncomingWindow + ') = ' + sendable);
  return sendable;
};

// private API
SenderLink.prototype._sendMessage = function(message, options) {
  // preconditions
  if (this.linkCredit <= 0) {
    throw new errors.OverCapacityError('Cannot send if no link credit.');
  }

  options = options || {};

  // session bookkeeping
  var messageId = this.session._sessionParams.nextOutgoingId;
  this.session._sessionParams.nextOutgoingId++;
  this.session._sessionParams.remoteIncomingWindow--;
  this.session._sessionParams.outgoingWindow--;
  if (this.session._sessionParams.remoteIncomingWindow < 0) {
    if (this.session.policy.enableSessionFlowControl) {
      throw new errors.OverCapacityError('Cannot send message - over Session window capacity (' + this.session._sessionParams.remoteIncomingWindow + ' window)');
    } else {
      this.session._sessionParams.remoteIncomingWindow =
        this.session._sessionParams.outgoingWindow = 0;
    }
  }

  this.session._transfersInFlight[messageId] = {
    message: message,
    options: options,
    sent: Date.now()
  };

  // create frame and send
  var transferOptions = _.defaults(options, {
    channel: this.session.channel,
    handle: this.handle,
    deliveryId: messageId,
    settled: this.session._sessionParams.senderSettleMode === constants.senderSettleMode.settled,
    message: message
  });

  this.linkCredit--;
  this.session.connection.sendFrame(new TransferFrame(transferOptions));
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
