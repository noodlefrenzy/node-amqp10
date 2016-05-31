'use strict';

var Builder = require('buffer-builder'),
    Promise = require('bluebird'),
    util = require('util'),
    debug = require('debug')('amqp10:link:sender'),

    frames = require('./frames'),
    errors = require('./errors'),
    constants = require('./constants'),
    putils = require('./policies/policy_utilities'),
    m = require('./types/message'),
    u = require('./utilities'),

    DeliveryState = require('./types/delivery_state'),
    Link = require('./link');

function SenderLink(session, handle, linkPolicy) {
  SenderLink.super_.call(this, session, handle, linkPolicy);

  this._pendingSends = [];
  this._unsettledSends = {};
}
util.inherits(SenderLink, Link);

// public API
SenderLink.prototype.attach = function() {
  this.initialDeliveryCount = this.policy.attach.initialDeliveryCount;
  this.deliveryCount = 0;

  // call super method
  SenderLink.super_.prototype.attach.call(this);
};

SenderLink.prototype.canSend = function() {
  if (this.state() !== 'attached') {
    return false;
  }

  var sendable = this.linkCredit >= 1 &&
    (!this.session.policy.enableSessionFlowControl || this.session._sessionParams.remoteIncomingWindow >= 1);
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

  options = options || {};
  if (!!this.policy.defaultSubject) {
    if (!options.properties) options.properties = {};
    if (!options.properties.subject)
      options.properties.subject = this.policy.defaultSubject;
  }

  var self = this;
  return new Promise(function(resolve, reject) {
    var message;
    if (u.isObject(msg) && msg.hasOwnProperty('body')) {
      message = msg;
      message.body = self.policy.encoder ? self.policy.encoder(message.body) : message.body;
      u.merge(message, options);
    } else {
      msg = self.policy.encoder ? self.policy.encoder(msg) : msg;
      if (u.isObject(options)) {
        options.body = msg;
        message = options;
      } else {
        message = { body: msg };
      }
    }

    var deliveryTag = self.session._deliveryTag++;
    var sendMessage = function(err) {
      if (err) {
        reject(err);
      } else {
        debug('sending: ', msg);
        var messageId = self._sendMessage(message, {
          deliveryTag: new Buffer(deliveryTag.toString())
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

    if (!self.canSend()) {
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

  // create frame(s)
  var transferOptions = u.defaults(options, {
    channel: this.session.channel,
    handle: this.handle,
    deliveryId: messageId,
    settled: this.session._sessionParams.senderSettleMode === constants.senderSettleMode.settled,
  });

  // pre-encode message to determine if multiple frames are required
  var messageBuilder = new Builder();
  m.encodeMessage(message, messageBuilder);
  var messageBuffer = messageBuilder.get();

  // send the frame(s)
  var frame;
  var maxFrameSize = this.session.connection._params.maxFrameSize;
  var frameOverhead = frames.TRANSFER_FRAME_OVERHEAD + options.deliveryTag.length;
  var idealMessageSize = maxFrameSize - frameOverhead;
  var approximateFrameSize = messageBuffer.length + frameOverhead;
  if (approximateFrameSize >= maxFrameSize) {
    var messageCount = Math.ceil(messageBuffer.length / idealMessageSize);
    var bufferIdx = 0;
    for (var i = 0; i < messageCount; ++i) {
      transferOptions.more = (i !== messageCount - 1) ? true : false;
      frame = new frames.TransferFrame(transferOptions);
      frame.payload = messageBuffer.slice(bufferIdx, bufferIdx + idealMessageSize);
      this.session.connection.sendFrame(frame);
      bufferIdx += idealMessageSize;
    }
  } else {
    frame = new frames.TransferFrame(transferOptions);
    frame.payload = messageBuffer;
    this.session.connection.sendFrame(frame);
  }

  this.linkCredit--;
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
    delete this._unsettledSends[messageId];
  }
};

module.exports = SenderLink;
