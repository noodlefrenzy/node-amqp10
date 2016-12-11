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
 * @class
 * @param {object} overrides    override values for the default policy
 */
function Policy(overrides) {
  if (!(this instanceof Policy))
    return new Policy(overrides);

  u.defaults(this, overrides, {
    /**
     * support subjects in link names with the following characteristics:
     * receiver: "amq.topic/news", means a filter on the ReceiverLink will be made
     *           for messages send with a subject "news"
     *
     * sender: "amq.topic/news", will automatically set "news" as the subject for
     *         messages sent on this link, unless the user explicitly overrides
     *         the subject.
     *
     * @name Policy#defaultSubjects
     * @property {boolean}
     */
    defaultSubjects: true,

    /**
     * Options related to the reconnect behavior of the client. If this value is `null` reconnect
     * is effectively disabled
     *
     * @name Policy#reconnect
     * @type {Object|null}
     * @property {number|null} [retries] How many times to attempt reconnection
     * @property {string} [strategy='fibonacci'] The algorithm used for backoff. Can be `fibonacci` or `exponential`
     * @property {boolean} [forever] Whether or not to attempt reconnection forever
     */
    reconnect: {
      retries: 10,
      strategy: 'fibonacci', // || 'exponential'
      forever: true
    },

    /**
     * @name Policy#connect
     * @type {object}
     * @property {object} options Options passed into the open performative on initial connection
     * @property {string|function} options.containerId The id of the source container
     * @property {string} options.hostname The name of the target host
     * @property {number} options.maxFrameSize The largest frame size that the sending peer is able to accept on this connection
     * @property {number} options.channelMax The channel-max value is the highest channel number that can be used on the connection
     * @property {number} options.idleTimeout The idle timeout required by the sender
     * @property {array<string>|null} options.outgoingLocales A list of the locales that the peer supports for sending informational text
     * @property {array<string>|null} options.incomingLocales A list of locales that the sending peer permits for incoming informational text
     * @property {array<string>|null} options.offeredCapabilities A list of extension capabilities the peer may use if the sender offers them
     * @property {array|null} options.desiredCapabilities The desired-capability list defines which extension capabilities the sender may use if the receiver offers them
     * @property {object|null} options.properties The properties map contains a set of fields intended to indicate information about the connection and its container
     * @property {object} sslOptions Options used to initiate a TLS/SSL connection, with the exception of the following options all options in this object are passed directly to node's [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) method.
     * @property {string|null} sslOptions.keyFile Path to the file containing the private key for the client
     * @property {string|null} sslOptions.certFile Path to the file containing the certificate key for the client
     * @property {string|null} sslOptions.caFile Path to the file containing the trusted cert for the client
     * @property {boolean} sslOptions.rejectUnauthorized
     * @property {string|null} saslMechanism Allows the sasl mechanism to be overriden by policy
     */
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
      },
      sslOptions: {
        keyFile: null,
        certFile: null,
        caFile: null,
        rejectUnauthorized: false
      },
      saslMechanism: null
    },

    /**
     * @name Policy#session
     * @type {object}
     * @property {object} options Options passed into the `begin` performative on session start
     * @property {number} options.nextOutgoingId The transfer-id to assign to the next transfer frame
     * @property {number} options.incomingWindow The maximum number of incoming transfer frames that the endpoint can currently receive
     * @property {number} options.outgoingWindow The maximum number of outgoing transfer frames that the endpoint can currently send
     * @property {function} window A function used to calculate how/when the flow control window should change
     * @property {number} windowQuantum Quantum used in predefined window policies
     * @property {boolean} enableSessionFlowControl Whether or not session flow control should be performed at all
     */
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

    /**
     * @name Policy#senderLink
     * @type {object}
     * @property {object} attach Options passed into the `attach` performative on link attachment
     * @property {string|function} attach.name This name uniquely identifies the link from the container of the source to the container of the target node
     * @property {string|boolean} attach.role The role being played by the peer
     * @property {string|number} attach.senderSettleMode The delivery settlement policy for the sender
     * @property {number} attach.maxMessageSize The maximum message size supported by the link endpoint
     * @property {number} attach.initialDeliveryCount This must not be null if role is sender, and it is ignored if the role is receiver.
     * @property {string} callback Determines when a send should call its callback ('settle', 'sent', 'none')
     * @property {function|null} encoder=null The optional encoder used for all outgoing sends
     * @property {boolean|null} reattach=null Whether the link should attempt reattach on detach
     */
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

    /**
     * @name Policy#receiverLink
     * @type {object}
     * @property {object} attach Options passed into the `attach` performative on link attachment
     * @property {string|function} attach.name This name uniquely identifies the link from the container of the source to the container of the target node
     * @property {boolean} attach.role The role being played by the peer
     * @property {number|string} attach.receiverSettleMode The delivery settlement policy for the receiver
     * @property {number} attach.maxMessageSize The maximum message size supported by the link endpoint
     * @property {number} attach.initialDeliveryCount This must not be null if role is sender, and it is ignored if the role is receiver.
     * @property {function} credit A function that determines when (if ever) to refresh the receiver link's credit
     * @property {number} creditQuantum Quantum used in pre-defined credit policy functions
     * @property {function|null} decoder=null The optional decoder used for all incoming data
     * @property {boolean|null} reattach=null Whether the link should attempt reattach on detach
     */
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

  return this;
}


/**
 * Parses a link address used for creating Sender and Receiver links.
 *
 * The resulting object has a required `name` property (used as the source
 * address in the attach performative), as well as an optional `subject` property
 * which (if specified) will automatically create a source filter.
 *
 * @inner @memberof Policy
 * @param {string} address the address to parse
 * @return {object}
 */
Policy.prototype.parseLinkAddress = function(address) {
  // @todo: this "parsing" should be far more rigorous
  if (!this.defaultSubjects) {
    return { name: address };
  }

  var parts = address.split('/');
  var result = { name: parts.shift() };
  if (parts.length) result.subject = parts.shift();
  return result;
};

/**
 * Parses an address for use when connecting to an AMQP 1.0 broker
 *
 * @inner @memberof Policy
 * @param {string} address the address to parse
 * @return {object}
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
