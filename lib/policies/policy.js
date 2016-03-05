'use strict';
var url = require('url'),
    constants = require('../constants'),
    putils = require('./policy_utilities'),
    u = require('../utilities');

function containerName() {
  return function() { return 'conn' + Date.now(); };
}

function linkName(prefix) {
  var id = 1;
  var pre = prefix;
  return function() {
    return pre + (id++);
  };
}

/**
 * The default policy for amqp10 clients
 *
 * @param {Object} overrides    override values for the default policy
 * @return {Object}
 */
function Policy(overrides) {
  if (!(this instanceof Policy))
    return new Policy(overrides);

  u.defaults(this, overrides, {
    // support subjects in link names with the following characteristics:
    // receiver: "amq.topic/news", means a filter on the ReceiverLink will be made
    //           for messages send with a subject "news"
    //
    // sender: "amq.topic/news", will automatically set "news" as the subject for
    //         messages sent on this link, unless the user explicitly overrides
    //         the subject.
    defaultSubjects: true,

    reconnect: {
      retries: 10,
      strategy: 'fibonacci', // || 'exponential'
      forever: true
    },

    connect: {
      options: {
        containerId: containerName(),
        hostname: 'localhost',
        maxFrameSize: constants.defaultMaxFrameSize,
        channelMax: constants.defaultChannelMax,
        idleTimeout: constants.defaultIdleTimeout,
        outgoingLocales: constants.defaultOutgoingLocales,
        incomingLocales: constants.defaultIncomingLocales,
        offeredCapabilities: null,
        desiredCapabilities: null,
        properties: {},
        sslOptions: {
          keyFile: null,
          certFile: null,
          caFile: null,
          rejectUnauthorized: false
        }
      }
    },

    session: {
      options: {
        nextOutgoingId: constants.session.defaultOutgoingId,
        incomingWindow: constants.session.defaultIncomingWindow,
        outgoingWindow: constants.session.defaultOutgoingWindow
      },
      window: putils.WindowPolicies.RefreshAtHalf,
      windowQuantum: constants.session.defaultIncomingWindow,
      enableSessionFlowControl: true
    },

    senderLink: {
      attach: {
        name: linkName('sender'),
        role: constants.linkRole.sender,
        senderSettleMode: constants.senderSettleMode.mixed,
        maxMessageSize: 0,
        initialDeliveryCount: 1
      },
      callback: putils.SenderCallbackPolicies.OnSettle,
      encoder: null,
      reattach: null
    },

    receiverLink: {
      attach: {
        name: linkName('receiver'),
        role: constants.linkRole.receiver,
        receiverSettleMode: constants.receiverSettleMode.autoSettle,
        maxMessageSize: 10000, // Arbitrary choice
        initialDeliveryCount: 1
      },
      credit: putils.CreditPolicies.RefreshAtHalf,
      creditQuantum: 100,
      decoder: null,
      reattach: null
    },
  });

  return Object.seal(this);
}

/**
 * Parses an address for use when connecting to an AMQP 1.0 broker
 *
 * @param {String}    the address to parse
 * @return {Object}
 */
Policy.prototype.parseAddress = function(address) {
  var parsedAddress = url.parse(address);
  var result = {
    host: parsedAddress.hostname || parsedAddress.href,
    path: (parsedAddress.path && parsedAddress.path !== address) ?
      parsedAddress.path : '/',
    protocol: parsedAddress.protocol ?
      parsedAddress.protocol.slice(0, -1).toLowerCase() : 'amqp',
    href: parsedAddress.href
  };

  if (!!parsedAddress.port) {
    result.port = parseInt(parsedAddress.port);
  } else {
    switch (result.protocol.toLowerCase()) {
      case 'amqp': result.port = constants.defaultPort; break;
      case 'amqps': result.port = constants.defaultTlsPort; break;
    }
  }

  result.rootUri = result.protocol + '://';
  if (!!parsedAddress.auth) {
    result.rootUri += parsedAddress.auth + '@';

    var userPass = parsedAddress.auth.split(':', 2);
    result.user = userPass[0];
    result.pass = userPass[1] || null;
  }

  result.rootUri += result.host + ':' + result.port;
  return result;
};

module.exports = Policy;
