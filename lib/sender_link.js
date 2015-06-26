'use strict';

var _ = require('lodash'),
    Promise = require('bluebird'),
    util = require('util'),
    debug = require('debug')('amqp10:link:sender'),

    errors = require('./errors'),
    constants = require('./constants'),
    putils = require('./policies/policy_utilities'),

    TransferFrame = require('./frames/transfer_frame'),

    DeliveryState = require('./types/delivery_state'),
    M = require('./types/message'),
    Link = require('./link');

function SenderLink(session, handle, linkPolicy) {
  SenderLink.super_.call(this, session, handle, linkPolicy);

  this._messageId = 1;
  this._pendingSends = [];
  this._unsettledSends = {};
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

/**
 * Sends the given message, with the given options on this link
 *
 * @method send
 * @param {*} msg               Message to send.  Will be encoded using sender link policy's encoder.
 * @param {*} [options]         An object of options to attach to the message including: annotations, properties,
                                and application properties
 * @param options.annotations   Annotations for the message, if any.  See AMQP spec for details, and server for specific
 *                               annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd
 *                               map is given, it will be translated to appropriate internal types.  Simple maps will be converted
 *                               to AMQP Fields type as defined in the spec.
 *
 * @return {Promise}
 */
SenderLink.prototype.send = function(msg, options) {
  if (!this.session.connection) {
    throw new Error('Must connect before sending');
  }

  var self = this;
  return new Promise(function(resolve, reject) {
    var message = new M.Message(options, self.policy.encoder(msg));
    var sendMessageId = self._messageId++;

    var sendMessage = function(err) {
      if (err) {
        reject(err);
      } else {
        debug('sending: ', msg);

        // @todo: deliveryTag is NO LONGER UNIQUE, figure out better way to track
        //        message ids
        var messageId = self._sendMessage(message, {
          deliveryTag: new Buffer(sendMessageId.toString())
        });

        var cbPolicy = self.policy.callback;
        if (cbPolicy === putils.SenderCallbackPolicies.OnSettle) {
          var deferredSender = function(err, state) {
            if (!!err) {
              reject(err);
            } else {
              resolve(state);
            }
          };
          self._unsettledSends[messageId] = deferredSender;
        } else if (cbPolicy === putils.SenderCallbackPolicies.OnSent) {
          resolve();
        } else {
          reject(new errors.ArgumentError('Invalid sender callback policy: ' + cbPolicy));
        }
      }
    };

    if (!self.attached || !self.canSend()) {
      self._pendingSends.push(sendMessage);
      return;
    }

    // otherwise send the message
    sendMessage(null);
  });
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
  this._dispatchPendingSends(null);
};

SenderLink.prototype._attachReceived = function(attachFrame) {
  SenderLink.super_.prototype._attachReceived.call(this, attachFrame);

  this._dispatchPendingSends(null);
};

SenderLink.prototype._detached = function(frame) {
  SenderLink.super_.prototype._detached.call(this, frame);

  // has an error occurred?
  if (frame && frame.error) {
    this._dispatchPendingSends(frame.error);
  }
};

SenderLink.prototype._dispatchPendingSends = function(err) {
  while (this._pendingSends && this._pendingSends.length > 0 && this.canSend()) {
    var sendMessage = this._pendingSends.shift();
    sendMessage(err);
  }
};

SenderLink.prototype._dispositionReceived = function(details) {
  if (!details.settled) {
    return;
  }

  var err = null;
  if (details.state instanceof DeliveryState.Rejected) {
    err = details.state.error;
  }

  var first = details.first;
  var last = details.last || first;
  for (var messageId = first; messageId <= last; ++messageId) {
    if (!this._unsettledSends[messageId]) {
      continue;
    }

    this._unsettledSends[messageId](err, details.state);
    this._unsettledSends[messageId] = undefined;
  }
};

module.exports = SenderLink;
