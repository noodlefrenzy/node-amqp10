'use strict';

var constants = require('../constants'),
    u = require('../utilities'),
    DefaultPolicy = require('./default_policy');

module.exports = u.deepMerge({
  senderLink: {
    options: {
      role: constants.linkRole.sender,
      senderSettleMode: constants.senderSettleMode.settled,
      receiverSettleMode: constants.receiverSettleMode.autoSettle,
      maxMessageSize: 10000, // Arbitrary choice
      initialDeliveryCount: 1
    },
    encoder: function(body) {
      var bodyStr = body;
      if (typeof body !== 'string') {
        bodyStr = JSON.stringify(body);
      }
      return new Buffer(bodyStr, 'utf8');
    }
  },
  receiverLink: {
    options: {
      role: constants.linkRole.receiver,
      senderSettleMode: constants.senderSettleMode.settled,
      receiverSettleMode: constants.receiverSettleMode.autoSettle,
      maxMessageSize: 10000, // Arbitrary choice
      initialDeliveryCount: 1
    },
    decoder: function(body) {
      var bodyStr = null;
      if (body instanceof Buffer) {
        bodyStr = body.toString();
      } else if (typeof body === 'string') {
        bodyStr = body;
      } else {
        return body; // No clue.
      }
      try {
        return JSON.parse(bodyStr);
      } catch (e) {
        return bodyStr;
      }
    }
  }
}, DefaultPolicy);

