'use strict';
var constants = require('../../../lib/constants'),
    ErrorCondition = require('../../../lib/types/error_condition');

module.exports = {
  Client: require('./client'),
  Server: require('./server'),
  Connection: require('./connection'),
  Session: require('./session'),
  SenderLink: require('./sender_link'),
  ReceiverLink: require('./receiver_link'),

  // useful default options
  Defaults: {
    begin: {
      remoteChannel: 1, nextOutgoingId: 0,
      incomingWindow: 100000, outgoingWindow: 2147483647,
      handleMax: 4294967295
    },
    attach: {
      handle: 1,
      role: constants.linkRole.sender,
      source: {}, target: {},
      initialDeliveryCount: 0
    },
    flow: {
      handle: 1, deliveryCount: 1,
      nextIncomingId: 1, incomingWindow: 2147483647,
      nextOutgoingId: 0, outgoingWindow: 2147483647,
      linkCredit: 500
    },
    close: {
      error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
    }
  }
};
