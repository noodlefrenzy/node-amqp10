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

/**
 * @class
 * @extends Link
 */
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
 * @inner @memberof SenderLink
 * @param {object|string|array} msg Message to send.  Will be encoded using sender link policy's encoder.
 * @param {object} [options] An object of options to attach to the message including: annotations, properties,
 *                           and application properties
 * @param {string} [options.callback] Determines when the send operation should callback. Possible
 *                                    options are: 'sent', 'settled' and 'none'. For the best performance
 *                                    choose 'none', which is essentially "send and forget" and notably will
 *                                    not return a promise.
 * @param {object} [options.annotations] Annotations for the message, if any.  See AMQP spec for details, and server for specific
 *                                       annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd
 *                                       map is given, it will be translated to appropriate internal types.  Simple maps will be converted
 *                                       to AMQP Fields type as defined in the spec.
 *
 * @return {Promise|null}
 */
SenderLink.prototype.send = function(msg, options) {
  options = options || {};

  var noReply = false;
  if (options.hasOwnProperty('noReply')) {
    noReply = !!options.noReply;
    delete options.noReply;
  }

  if (!!this.policy.defaultSubject) {
    if (!options.properties) options.properties = {};
    if (!options.properties.subject)
      options.properties.subject = this.policy.defaultSubject;
  }

  var message;
  var deliveryTag = this.session._deliveryTag++;
  if (u.isObject(msg) && msg.hasOwnProperty('body')) {
    message = msg;
    message.body = this.policy.encoder ? this.policy.encoder(message.body) : message.body;
    u.merge(message, options);
  } else {
    msg = this.policy.encoder ? this.policy.encoder(msg) : msg;
    if (u.isObject(options)) {
      options.body = msg;
      message = options;
    } else {
      message = { body: msg };
    }
  }

  var self = this,
      cbPolicy = self.policy.callback;

  if (cbPolicy === putils.SenderCallbackPolicies.None) {
    var sendMessage = function(err) {
      if (!!err) throw err;
      debug('sending: ', msg);
      return self._sendMessage(message, {
        deliveryTag: new Buffer(deliveryTag.toString())
      });
    };

    if (!this.canSend()) {
      this._pendingSends.push(sendMessage);
      return;
    }

    sendMessage();
    return;
  }

  return new Promise(function(resolve, reject) {
    var sendMessage = function(err) {
      if (err) {
        return reject(err);
      }

      debug('sending: ', msg);
      var messageId = self._sendMessage(message, {
        deliveryTag: new Buffer(deliveryTag.toString())
      });

      if (cbPolicy === putils.SenderCallbackPolicies.OnSettle) {
        var deferredSender = function(err, state) {
          if (!!err) return reject(err);
          resolve(state);
        };
        self._unsettledSends[messageId] = deferredSender;
      } else if (cbPolicy === putils.SenderCallbackPolicies.OnSent) {
        resolve();
      } else {
        reject(new TypeError('Invalid sender callback policy: ' + cbPolicy));
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
  var maxFrameSize = this.session.connection.remote.open.maxFrameSize;
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

  this.deliveryCount++;
  this.linkCredit--;
  return messageId;
};

SenderLink.prototype._flowReceived = function(frame) {
  if (frame.handle !== null) {
    this.available = frame.available; // TODO: ?? I believe we should not be overwriting this
    this.linkCredit = frame.deliveryCount + frame.linkCredit - this.deliveryCount;

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
  if (this._pendingSends && this._pendingSends.length !== 0) {
    while (this._pendingSends.length > 0 && (!!err ? true : this.canSend())) {
      var sendMessage = this._pendingSends.shift();
      sendMessage(err);
    }
  }

  if (!!err && this._unsettledSends && Object.keys(this._unsettledSends).length) {
    var self = this;
    Object.keys(this._unsettledSends).forEach(function(id) {
      var deferredSender = self._unsettledSends[id];
      deferredSender(err, null);
      delete self._unsettledSends[id];
    });

    this._unsettledSends = {};
  }
};

SenderLink.prototype._dispositionReceived = function(details) {
  if (!details.settled) {
    return;
  }

  var err = null;
  if (details.state instanceof DeliveryState.Rejected) {
    err = !!details.state.error ?
      details.state.error : new errors.BaseError('Message was rejected');
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

// @override
SenderLink.prototype.forceDetach = function() {
  this._dispatchPendingSends(new errors.ProtocolError('amqp:link:detach-forced', 'detach-forced'));
  Link.prototype.forceDetach.call(this);
};

module.exports = SenderLink;
