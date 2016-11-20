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
     * @memberof Policy
     * @member {boolean}
     */
    defaultSubjects: true,

    /**
     * Options related to the reconnect behavior of the client. If this value is `null` reconnect
     * is effectively disabled
     * @memberof Policy
     * @member {object|null}
     */
    reconnect: {
      /**
       * How many times to attempt reconnection
       * @member {number|null}
       */
      retries: 10,

      /**
       * The algorithm used for backoff. Can be `fibonacci` or `exponential`
       * @member {string}
       */
      strategy: 'fibonacci', // || 'exponential'

      /**
       * Whether or not to attempt reconnection forever
       * @member {boolean}
       */
      forever: true
    },

    /**
     * @memberof Policy
     * @member {object}
     */
    connect: {
      /**
       * Options passed into the open performative on initial connection
       * @member {object}
       */
      options: {
        /**
         * The id of the source container
         * @member {string|function}
         */
        containerId: containerName(),

        /**
         * The name of the target host
         * @member {string}
         */
        hostname: 'localhost',

        /**
         * The largest frame size that the sending peer is able to accept on this connection
         * @member {number}
         */
        maxFrameSize: constants.defaultMaxFrameSize,

        /**
         * The channel-max value is the highest channel number that can be used on the connection
         * @member {number}
         */
        channelMax: constants.defaultChannelMax,

        /**
         * The idle timeout required by the sender
         * @member {number}
         */
        idleTimeout: constants.defaultIdleTimeout,

        /**
         * A list of the locales that the peer supports for sending informational text
         * @member {array<string>|null}
         */
        outgoingLocales: constants.defaultOutgoingLocales,

        /**
         * A list of locales that the sending peer permits for incoming informational text
         * @member {array<string>|null}
         */
        incomingLocales: constants.defaultIncomingLocales,

        /**
         * A list of extension capabilities the peer may use if the sender offers them
         * @member {array<string>|null}
         */
        offeredCapabilities: null,

        /**
         * The desired-capability list defines which extension capabilities the sender may
         * use if the receiver offers them
         * @member {array|null}
         */
        desiredCapabilities: null,

        /**
         * The properties map contains a set of fields intended to indicate information
         * about the connection and its container
         * @member {object|null}
         */
        properties: {},

        /**
         * Options used to initiate a TLS/SSL connection, with the exception of the
         * following options all options in this object are passed directly to node's
         * [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) method.
         *
         * @member {object}
         */
        sslOptions: {
          /**
           * Path to the file containing the private key for the client
           * @member {string|null}
           */
          keyFile: null,

          /**
           * Path to the file containing the certificate key for the client
           * @member {string|null}
           */
          certFile: null,

          /**
           * Path to the file containing the trusted cert for the client
           * @member {string|null}
           */
          caFile: null,
          rejectUnauthorized: false
        }
      },

      /**
       * Allows the sasl mechanism to be overriden by policy
       * @member {string|null}
       */
      saslMechanism: null
    },

    /**
     * @memberof Policy
     * @member {object}
     */
    session: {
      /**
       * Options passed into the `begin` performative on session start
       * @member {object}
       */
      options: {
        /**
         * The transfer-id to assign to the next transfer frame
         * @member {number}
         */
        nextOutgoingId: constants.session.defaultOutgoingId,

        /**
         * The maximum number of incoming transfer frames that the endpoint can currently receive
         * @member {number}
         */
        incomingWindow: constants.session.defaultIncomingWindow,

        /**
         * The maximum number of outgoing transfer frames that the endpoint can currently send
         * @member {number}
         */
        outgoingWindow: constants.session.defaultOutgoingWindow
      },

      /**
       * A function used to calculate how/when the flow control window should change
       * @member {function}
       */
      window: putils.WindowPolicies.RefreshAtHalf,

      /**
       * Quantum used in predefined window policies
       * @member {number}
       */
      windowQuantum: constants.session.defaultIncomingWindow,

      /**
       * Whether or not session flow control should be performed at all
       * @member {boolean}
       */
      enableSessionFlowControl: true
    },

    /**
     * @memberof Policy
     * @member {object}
     */
    senderLink: {
      /**
       * Options passed into the `attach` performative on link attachment
       * @member {object}
       */
      attach: {
        /**
         * This name uniquely identifies the link from the container of the source to
         * the container of the target node
         * @member {string|function}
         */
        name: linkName('sender'),

        /**
         * The role being played by the peer
         * @member {string|boolean}
         */
        role: constants.linkRole.sender,

        /**
         * The delivery settlement policy for the sender
         * @member {string|number}
         */
        senderSettleMode: constants.senderSettleMode.mixed,

        /**
         * The maximum message size supported by the link endpoint
         * @member {number}
         */
        maxMessageSize: 0,

        /**
         * This must not be null if role is sender, and it is ignored if the role is receiver.
         * @member {number}
         */
        initialDeliveryCount: 1
      },

      /**
       * Determines when a send should call its callback.
       * @member {string}
       */
      callback: putils.SenderCallbackPolicies.OnSettle,

      /**
       * The encoder used for all outgoing sends
       * @member {function|null}
       */
      encoder: null,

      /**
       * Whether the link should attempt reattach on detach
       * @member {boolean|null}
       */
      reattach: null
    },

    /**
     * @memberof Policy
     * @member {object}
     */
    receiverLink: {
      /**
       * Options passed into the `attach` performative on link attachment
       * @member {object}
       */
      attach: {
        /**
         * This name uniquely identifies the link from the container of the source to
         * the container of the target node
         * @member {string|function}
         */
        name: linkName('receiver'),

        /**
         * The role being played by the peer
         * @member {boolean}
         */
        role: constants.linkRole.receiver,

        /**
         * The delivery settlement policy for the receiver
         * @member {number|string}
         */
        receiverSettleMode: constants.receiverSettleMode.autoSettle,

        /**
         * The maximum message size supported by the link endpoint
         * @member {number}
         */
        maxMessageSize: 10000, // Arbitrary choice

        /**
         * This must not be null if role is sender, and it is ignored if the role is receiver.
         * @member {number}
         */
        initialDeliveryCount: 1
      },

      /**
       * A function that determines when (if ever) to refresh the receiver link's credit
       * @member {function}
       */
      credit: putils.CreditPolicies.RefreshAtHalf,

      /**
       * Quantum used in pre-defined credit policy functions
       * @member {number}
       */
      creditQuantum: 100,

      /**
       * The decoder used for all incoming data
       * @member {function|null}
       */
      decoder: null,

      /**
       * Whether the link should attempt reattach on detach
       * @member {boolean|null}
       */
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
