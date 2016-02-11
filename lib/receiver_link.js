'use strict';

var util = require('util'),
    BufferList = require('bl'),
    debug = require('debug')('amqp10:link:receiver'),

    constants = require('./constants'),
    u = require('./utilities'),

    frames = require('./frames'),
    DeliveryState = require('./types/delivery_state'),
    Link = require('./link');

function ReceiverLink(session, handle, linkPolicy) {
  ReceiverLink.super_.call(this, session, handle, linkPolicy);
  this._currentTransferFrame = null;
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
  var options = u.defaults(flowOptions, {
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

  this.session.connection.sendFrame(new frames.FlowFrame(options));
};

/**
 * Settle a message (or array of messages) with an Accepted delivery outcome
 *
 * @param {String|Array}  [message] message, or array of messages to settle
 */
ReceiverLink.prototype.accept = function(message) {
  this.settle(message, new DeliveryState.Accepted());
};

/**
 * Settle a message (or array of messages) with a Rejected delivery outcome
 *
 * @param {String|Array}  [message] message, or array of messages to settle
 * @param {String}        [error] error that caused the message to be rejected
 */
ReceiverLink.prototype.reject = function(message, error) {
  this.settle(message, new DeliveryState.Rejected({ error: error }));
};

/**
 * Settle a message (or array of messages) with a Released delivery outcome
 *
 * @param {String|Array}  [message] message, or array of messages to settle
 */
ReceiverLink.prototype.release = function(message) {
  this.settle(message, new DeliveryState.Released());
};

/**
 * Settle a message (or array of messages) with a Modified delivery outcome
 *
 * @param {String|Array}  [message] message, or array of messages to settle
 * @param {Object}        [options] options used for a Modified outcome
 * @param {Boolean}       [options.deliveryFailed] count the transfer as an unsuccessful delivery attempt
 * @param {Boolean}       [options.undeliverableHere] prevent redelivery
 * @param {Object}        [options.messageAnnotations] message attributes to combine with existing annotations
 */
ReceiverLink.prototype.modify = function(message, options) {
  this.settle(message, new DeliveryState.Modified(options));
};

/**
 * Settle a message (or array of messages) with a given delivery state
 *
 * @param {String|Array}  [message] message, or array of messages to settle
 * @param {Object}        [state] outcome of message delivery
 */
ReceiverLink.prototype.settle = function(message, state) {
  var range = u.dispositionRange(message);
  this._sendDisposition(u.defaults(range, {
    settled: true,
    state: state
  }));

  this._checkCredit();
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
  var dispositionOptions = u.defaults(options, {
    role: constants.linkRole.receiver,
    channel: this.session.channel,
    handle: this.handle
  });

  this.session.connection.sendFrame(
    new frames.DispositionFrame(dispositionOptions)
  );
};

ReceiverLink.prototype._messageReceived = function(transferFrame) {
  if (transferFrame.aborted) {
    this._currentTransferFrame = null;
    debug('Message transfer aborted.');
    return;
  }

  if (transferFrame.more) {
    if (this._currentTransferFrame) {
      // @todo What do we do if deliveryId/deliveryTag don't match?
      this._currentTransferFrame.payload.append(transferFrame.payload);
    } else {
      this._currentTransferFrame = transferFrame;
      // Replace with BufferList for more performant appends.
      this._currentTransferFrame.payload = new BufferList(this._currentTransferFrame.payload);
    }

    return;
  }

  var curFrame = transferFrame;
  if (this._currentTransferFrame) {
    this._currentTransferFrame.payload.append(transferFrame.payload);
    curFrame = this._currentTransferFrame;
    this._currentTransferFrame = null;
  }

  var message = frames.decodeMessagePayload(curFrame.payload);
  // store deliveryId for later use
  message._deliveryId = curFrame.deliveryId;
  this.linkCredit--;
  debug('Rx message ' + transferFrame.deliveryId + ' on ' + this.name + ', ' + this.linkCredit + ' credit, ' + this.session._sessionParams.incomingWindow + ' window left.');
  // @todo Bump link credit based on strategy

  // respect settle mode in policy
  if (this.policy.attach.receiverSettleMode === constants.receiverSettleMode.autoSettle) {
    this.accept(message);
  }

  // optionally decode message based on policy
  var payload = message.body[0] || message.body;
  message.body = this.policy.decoder ? this.policy.decoder(payload) : payload;
  debug('received from (' + this.name + '): ' + message.body);

  this.emit(Link.MessageReceived, message);
};

ReceiverLink.prototype._dispositionReceived = function(details) {
  debug('not yet processing "receiver" disposition frames');
};

module.exports = ReceiverLink;
