'use strict';

var util = require('util'),
    BufferList = require('bl'),
    debug = require('debug')('amqp10:link:receiver'),

    constants = require('./constants'),
    u = require('./utilities'),

    m = require('./types/message'),
    frames = require('./frames'),
    DeliveryState = require('./types/delivery_state'),
    Link = require('./link');

/**
 * @class
 * @extends Link
 * @fires ReceiverLink#message
 */
function ReceiverLink(session, handle, linkPolicy) {
  ReceiverLink.super_.call(this, session, handle, linkPolicy);
  // If we're not auto-settling, we should track settles to allow refresh policies to decide when to re-up.
  this._trackSettles = linkPolicy && linkPolicy.attach && linkPolicy.attach.receiverSettleMode !== constants.receiverSettleMode.autoSettle;
  this._currentTransferFrame = null;
  if (this._trackSettles) this.settledMessagesSinceLastCredit = 0;
}
util.inherits(ReceiverLink, Link);

/**
 * Message received event.  Message payload given as argument.
 *
 * @event ReceiverLink#message
 * @param {object} message the received message
 * @param {object} [transferFrame] the transfer frame the message was extracted from
 */
ReceiverLink.MessageReceived = 'message';

/**
 * Credit change event
 *
 * @event ReceiverLink#creditChange
 */
ReceiverLink.CreditChange = 'creditChange';

// public API
/**
 * Add credits to this link
 *
 * @inner @memberof ReceiverLink
 * @param {number} credits number of credits to add
 * @param {object} [flowOptions] additional options to include in flow frame
 */
ReceiverLink.prototype.addCredits = function(credits, flowOptions) {
  if (credits > 0 && this._trackSettles) this.settledMessagesSinceLastCredit = 0;

  // increment credits
  this.linkCredit += credits;
  this.session._sessionParams.incomingWindow += credits;

  debug('addCredits ('+this.name+'): New values: link('+this.linkCredit+'), session('+this.session._sessionParams.incomingWindow+')');

  // send flow frame
  this.flow(flowOptions);
};

/**
 * Settle a message (or array of messages) with an Accepted delivery outcome
 *
 * @inner @memberof ReceiverLink
 * @param {string|array} message message, or array of messages to settle
 */
ReceiverLink.prototype.accept = function(message) {
  this.settle(message, new DeliveryState.Accepted());
};

/**
 * Settle a message (or array of messages) with a Rejected delivery outcome
 *
 * @inner @memberof ReceiverLink
 * @param {string|array} message message, or array of messages to settle
 * @param {string} [error] error that caused the message to be rejected
 */
ReceiverLink.prototype.reject = function(message, error) {
  this.settle(message, new DeliveryState.Rejected({ error: error }));
};

/**
 * Settle a message (or array of messages) with a Released delivery outcome
 *
 * @inner @memberof ReceiverLink
 * @param {string|array} message message, or array of messages to settle
 */
ReceiverLink.prototype.release = function(message) {
  this.settle(message, new DeliveryState.Released());
};

/**
 * Settle a message (or array of messages) with a Modified delivery outcome
 *
 * @inner @memberof ReceiverLink
 * @param {string|array} message message, or array of messages to settle
 * @param {object} [options] options used for a Modified outcome
 * @param {boolean} [options.deliveryFailed] count the transfer as an unsuccessful delivery attempt
 * @param {boolean} [options.undeliverableHere] prevent redelivery
 * @param {object} [options.messageAnnotations] message attributes to combine with existing annotations
 */
ReceiverLink.prototype.modify = function(message, options) {
  this.settle(message, new DeliveryState.Modified(options));
};

/**
 * Settle a message (or array of messages) with a given delivery state
 *
 * @inner @memberof ReceiverLink
 * @param {string|array} message message, or array of messages to settle
 * @param {object} [state] outcome of message delivery
 */
ReceiverLink.prototype.settle = function(message, state) {
  var range = u.dispositionRange(message);
  if (this._trackSettles) {
    this.settledMessagesSinceLastCredit += range.last - range.first + 1;
  }

  this._sendDisposition(u.defaults(range, {
    settled: true,
    state: state
  }));

  this._checkCredit();
};

// private API
ReceiverLink.prototype._flowReceived = function(flowFrame) {
  this.drain = flowFrame.drain;
  this.deliveryCount = Math.min(this.deliveryCount, flowFrame.deliveryCount);

  this.emit(ReceiverLink.CreditChange, this);
};

ReceiverLink.prototype._checkCredit = function(options) {
  if (this.policy.credit && typeof this.policy.credit === 'function') {
    this.policy.credit(this, options);
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
      // @todo: What do we do if deliveryId/deliveryTag don't match?
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

  var message = m.decodeMessage(curFrame.payload);
  // store deliveryId for later use
  Object.defineProperty(message, '_deliveryId', { value: curFrame.deliveryId });

  this.linkCredit--;
  this.deliveryCount++;
  debug('Rx message ' + transferFrame.deliveryId + ' on ' + this.name + ', ' + this.linkCredit + ' credit, ' + this.session._sessionParams.incomingWindow + ' window left.');
  // @todo: Bump link credit based on strategy

  // respect settle mode in policy
  if (this.policy.attach.receiverSettleMode === constants.receiverSettleMode.autoSettle) {
    this.accept(message);
  }

  // optionally decode message based on policy
  message.body = this.policy.decoder ? this.policy.decoder(message.body) : message.body;
  debug('received from (' + this.name + '): ' + message.body);

  this.emit(ReceiverLink.MessageReceived, message, curFrame);
};

ReceiverLink.prototype._dispositionReceived = function(details) {
  debug('not yet processing "receiver" disposition frames: ', details);
};

module.exports = ReceiverLink;
