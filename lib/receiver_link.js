'use strict';

var _ = require('lodash'),
    util = require('util'),
    debug = require('debug')('amqp10:link:receiver'),

    errors = require('./errors'),
    constants = require('./constants'),

    FlowFrame = require('./frames/flow_frame'),

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

// private API
ReceiverLink.prototype._flowReceived = function(flowFrame) {
  this.drain = flowFrame.drain;

  this.emit(Link.CreditChange, this);
};



module.exports = ReceiverLink;
