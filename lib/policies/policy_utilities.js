'use strict';

var debug = require('debug')('amqp10:policy:utils'),
    constants = require('../constants'),
    errors = require('../errors'),
    u = require('../utilities');

var WindowPolicies = {
  RefreshAtHalf: function(session) {
    if (session._sessionParams.incomingWindow < (session.policy.windowQuantum / 2)) {
      debug('Refreshing session window by ' + session.policy.windowQuantum + ': ' + session._sessionParams.incomingWindow + ' remaining.');
      session.addWindow(session.policy.windowQuantum);
    }
  },
  RefreshAtEmpty: function(session) {
    if (session._sessionParams.incomingWindow <= 0) {
      debug('Refreshing session window by ' + session.policy.windowQuantum + ': ' + session._sessionParams.incomingWindow + ' remaining.');
      session.addWindow(session.policy.windowQuantum);
    }
  },
  DoNotRefresh: function(session) {
    // Do Nothing
  }
};

module.exports.WindowPolicies = WindowPolicies;

var CreditPolicies = {
  RefreshAtHalf: function(link) {
    if (link.linkCredit < (link.policy.creditQuantum / 2)) {
      debug('Refreshing link ' + link.name + ' credit by ' + link.policy.creditQuantum + ': ' + link.linkCredit + ' remaining.');
      link.addCredits(link.policy.creditQuantum);
    }
  },
  RefreshAtEmpty: function(link) {
    if (link.linkCredit <= 0) {
      debug('Refreshing link ' + link.name + ' credit by ' + link.policy.creditQuantum + ': ' + link.linkCredit + ' remaining.');
      link.addCredits(link.policy.creditQuantum);
    }
  },
  RefreshSettled: function (threshold) {
    return function (link, options) {
      if (link.policy.rcvSettleMode === constants.receiverSettleMode.autoSettle) {
        throw new errors.InvalidStateError('Cannot specify RefreshSettled as link refresh policy when auto-settling messages.');
      }
      var creditQuantum = (!!options && options.initial) ? link.policy.creditQuantum : link.settledMessagesSinceLastCredit;
      if (creditQuantum > 0 && link.linkCredit < threshold) {
        debug('Refreshing link ' + link.name + ' credit by ' + creditQuantum + ': ' + link.linkCredit + ' remaining.');
        link.addCredits(creditQuantum);
      }
    };
  },
  DoNotRefresh: function(link) {
    // Do Nothing
  }
};

module.exports.CreditPolicies = CreditPolicies;

/**
 * Defines the behavior of the return value of `SenderLink.send`
 * @enum
 */
var SenderCallbackPolicy = {
  /** Callback immediately after sending, no promise is created */
  None: 'none',
  /** Only callback when settled Disposition received from recipient */
  OnSettle: 'settled',
  /** Callback as soon as sent, will not call-back again if future disposition
   *  results in error. */
  OnSent: 'sent',
};

module.exports.SenderCallbackPolicies = SenderCallbackPolicy; // deprecated
module.exports.SenderCallbackPolicy = SenderCallbackPolicy;

function fixDeprecatedOptions(policy) {
  if (policy === undefined || policy === null) return;

  if (policy.senderLink &&
      policy.senderLink.attach &&
      policy.senderLink.attach.hasOwnProperty('senderSettleMode')) {
    policy.senderLink.attach.sndSettleMode =
      policy.senderLink.attach.senderSettleMode;
    delete policy.senderLink.attach.senderSettleMode;
  }

  if (policy.receiverLink &&
      policy.receiverLink.attach &&
      policy.receiverLink.attach.hasOwnProperty('receiverSettleMode')) {
    policy.receiverLink.attach.rcvSettleMode = policy.receiverLink.attach.receiverSettleMode;
    delete policy.receiverLink.attach.receiverSettleMode;
  }
}

module.exports.fixDeprecatedOptions = fixDeprecatedOptions;

function merge(newPolicy, base) {
  var policy = u.deepMerge(newPolicy, base);
  fixDeprecatedOptions(policy);
  return policy;
}

module.exports.Merge = merge;

// Receiver links process messages N at a time, only renewing credits on ack.
module.exports.RenewOnSettle = function(initialCredit, threshold, basePolicy) {
  basePolicy = basePolicy || {};

  return merge({
    receiverLink: {
      credit: CreditPolicies.RefreshSettled(threshold),
      creditQuantum: initialCredit,
      attach: {
        rcvSettleMode: constants.receiverSettleMode.settleOnDisposition
      }
    }
  }, basePolicy);
};
