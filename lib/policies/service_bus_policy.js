'use strict';
var constants = require('../constants'),
    Policy = require('./policy');

module.exports = new Policy({
  defaultSubjects: false,
  senderLink: {
    attach: {
      senderSettleMode: constants.senderSettleMode.settled,
      maxMessageSize: 10000, // Arbitrary choice
    },
    encoder: function(body) {
      if (body instanceof Buffer) return body;
      var bodyStr = body;
      if (typeof body !== 'string') {
        bodyStr = JSON.stringify(body);
      }
      return new Buffer(bodyStr, 'utf8');
    },
    reattach: {
      retries: 10,
      strategy: 'fibonacci', // || 'exponential'
      forever: true
    }
  },
  receiverLink: {
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
    },
    reattach: {
      retries: 10,
      strategy: 'fibonacci', // || 'exponential'
      forever: true
    }
  }
});
