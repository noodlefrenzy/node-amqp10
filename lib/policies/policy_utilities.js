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
      if (link.policy.receiverSettleMode === constants.receiverSettleMode.autoSettle) {
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

function merge(newPolicy, base) {
  return u.deepMerge(newPolicy, base);
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
        receiverSettleMode: constants.receiverSettleMode.settleOnDisposition
      }
    }
  }, basePolicy);
};
