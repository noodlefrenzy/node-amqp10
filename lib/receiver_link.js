'use strict';

var _ = require('lodash'),
    Promise = require('bluebird'),
    util = require('util'),
    debug = require('debug')('amqp10:link:receiver'),

    errors = require('./errors'),
    constants = require('./constants'),
    u = require('./utilities'),

    FlowFrame = require('./frames/flow_frame'),
    DispositionFrame = require('./frames/disposition_frame'),

    DeliveryState = require('./types/delivery_state'),
    Link = require('./link');

function ReceiverLink(session, handle, linkPolicy) {
  ReceiverLink.super_.call(this, session, handle, linkPolicy);
}
util.inherits(ReceiverLink, Link);

// public API
ReceiverLink.prototype.addCredits = function(credits, flowOptions) {
  // increment credits
  this.linkCredit += credits;
  this.totalCredits += credits;
  this.session._sessionParams.incomingWindow += credits;

  // send flow frame
  flowOptions = flowOptions || {};
  var options = _.defaults(flowOptions, {
    channel: this.session.channel,
    handle: this.handle,
    linkCredit: this.totalCredits,
    nextIncomingId: this.session._sessionParams.nextIncomingId,
    incomingWindow: this.session._sessionParams.incomingWindow,
    nextOutgoingId: this.session._sessionParams.nextOutgoingId,
    outgoingWindow: this.session._sessionParams.outgoingWindow,
    available: this.available,
    deliveryCount: this.deliveryCount,
    drain: false
  });

  this.session.connection.sendFrame(new FlowFrame(options));

  // return promise
  var self = this;
  return new Promise(function(resolve, reject) {
    var onError = function(err) { reject(err); };
    self.once(Link.ErrorReceived, onError);
    self.once(Link.CreditChange, function() {
      self.removeListener(Link.ErrorReceived, onError);
      resolve();
    });
  });
};

ReceiverLink.prototype.accept = function(message) {
  var range = u.dispositionRange(message);
  this._sendDisposition(_.defaults(range, {
    settled: true,
    state: new DeliveryState.Accepted()
  }));
};

ReceiverLink.prototype.reject = function(message, reason) {
  var range = u.dispositionRange(message);
  this._sendDisposition(_.defaults(range, {
    settled: true,
    state: new DeliveryState.Rejected({ error: reason })
  }));
};

// private API
ReceiverLink.prototype._attachReceived = function(attachFrame) {
  this.deliveryCount = attachFrame.deliveryCount;

  // call super method
  ReceiverLink.super_.prototype._attachReceived.call(this, attachFrame);
};


ReceiverLink.prototype._flowReceived = function(flowFrame) {
  this.drain = flowFrame.drain;

  this.emit(Link.CreditChange, this);
};

ReceiverLink.prototype._checkCredit = function() {
  if (this.policy.credit && typeof this.policy.credit === 'function') {
    this.policy.credit(this);
  }
};

ReceiverLink.prototype._sendDisposition = function(options) {
  var dispositionOptions = _.defaults(options, {
    role: constants.linkRole.receiver,
    channel: this.session.channel,
    handle: this.handle
  });

  this.session.connection.sendFrame(
    new DispositionFrame(dispositionOptions)
  );
};

ReceiverLink.prototype._messageReceived = function(transferFrame) {
  this.linkCredit--;
  debug('Rx message ' + transferFrame.deliveryId + ' on ' + this.name + ', ' + this.linkCredit + ' credit, ' + this.session._sessionParams.incomingWindow + ' window left.');
  // @todo Bump link credit based on strategy

  // store deliveryId for later use
  transferFrame.message._deliveryId = transferFrame.deliveryId;

  // respect settle mode in policy
  if (this.policy.options.receiverSettleMode === constants.receiverSettleMode.autoSettle) {
    this.accept(transferFrame.message);
  }

  this.emit(Link.MessageReceived, transferFrame.message);
  this._checkCredit();
};

module.exports = ReceiverLink;
