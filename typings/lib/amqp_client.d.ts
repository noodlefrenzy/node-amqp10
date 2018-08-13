// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import { EventEmitter } from "events";

import Policy = require("./policies/policy");
import ReceiverLink = require("./receiver_link");
import SenderLink = require("./sender_link");
import _ReceiverStream = require("./streams/receiver_stream");
import _SenderStream = require("./streams/sender_stream");
import Session = require("./session");
import { SaslHandler } from "./sasl/sasl_utils";

/**
 * AMQPClient is the top-level class for interacting with node-amqp10.  Instantiate this class, connect, and then send/receive
 * as needed and behind the scenes it will do the appropriate work to setup and teardown connections, sessions, and links and manage flow.
 * The code does its best to avoid exposing AMQP-specific types and attempts to convert them where possible, but on the off-chance you
 * need to speak AMQP-specific (e.g. to set a filter to a described-type), you can use node-amqp-encoder and the
 * translator adapter to convert it to our internal types.  See simple_eventhub_test.js for an example.
 *
 * Configuring AMQPClient is done through a Policy class.  By default, DefaultPolicy will be used - it assumes AMQP defaults wherever
 * possible, and for values with no spec-defined defaults it tries to assume something reasonable (e.g. timeout, max message size).
 *
 * To define a new policy, you can merge your values into an existing one by calling AMQPClient.policies.merge(yourPolicy, existingPolicy).
 * This does a deep-merge, allowing you to only replace values you need.  For instance, if you wanted the default sender settle policy to be auto-settle instead of mixed,
 * you could just use
 *
 <pre>
 var AMQP = require('amqp10');
 var client = new AMQP.Client(AMQP.Policy.merge({
   senderLink: {
     attach: {
       senderSettleMode: AMQP.Constants.senderSettleMode.settled
     }
   }
 });
 </pre>
 *
 * Obviously, setting some of these options requires some in-depth knowledge of AMQP, so I've tried to define specific policies where I can.
 * For instance, for Azure EventHub connections, you can use the pre-build EventHubPolicy.
 *
 * Also, within the policy, see the encoder and decoder defined in the send/receive policies.  These define what to do with the message
 * sent/received, and by default do a simple pass-through, leaving the encoding to/decoding from AMQP-specific types up to the library which
 * does a best-effort job.  See EventHubPolicy for a more complicated example, turning objects into UTF8-encoded buffers of JSON-strings.
 */
declare class AMQPClient extends EventEmitter {
  policy: Policy;

  static ErrorReceived: "client:errorReceived";
  static ConnectionOpened: "connection:opened";
  static ConnectionClosed: "connection:closed";

  /**
   * Creates a new AMQPClient instance using DefaultPolicy.
   * @constructor
   */
  constructor();

  /**
   * Creates a new AMQPClient instance by overriding DefaultPolicy using given overrides.
   *
   * @param policyOverrides - Additional overrides for the default policy
   * @constructor
   */
  constructor(policyOverrides?: Policy.Overrides);

  /**
   * Creates a new AMQPClient instance.
   *
   * @param policy - Policy to use for connection, sessions, links, etc.  Defaults to DefaultPolicy.
   * @param [policyOverrides] - Additional overrides for the provided policy
   * @constructor
   */
  constructor(policy: Policy, policyOverrides?: Policy.Overrides);

  /**
   * Connects to a given AMQP server endpoint. Sets the default queue, so e.g.
   * amqp://my-activemq-host/my-queue-name would set the default queue to
   * my-queue-name for future send/receive calls.
   * 
   * @param url - URI to connect to, right now only supports `amqp` and `amqps` as protocol.
   * @param [policyOverrides] - Additional overrides for the provided policy
   */
  connect(url: string, policyOverrides?: Policy.Overrides): Promise<this>;

  /**
   * Creates a session for the current connection that can be associated with any
   * new links on that connection
   *
   * @inner @memberof AMQPClient
   * @param [policyOverrides] - Additional overrides for the provided policy
   * @return {Promise<Session>}
   */
  createSession(policyOverrides?: Policy.Overrides): Promise<Session>;

  /**
   * Creates a sender link for the given address, with optional link policy.
   *
   * @param {String} address                An address to connect this link to. If not provided will use default queue from connection uri.
   * @param {Object} [policyOverrides]      Policy overrides used for creating this sender link
   * @param {String} [policyOverrides.name] Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name]
   * @param {Object} [session]              A session for the current connection that can be associated with any
   *                                        new links on that connection
   */
  createSender(address: string, policyOverrides?: Policy.SenderLink, session?: Session): Promise<SenderLink>;

  /**
   * Creates a sender link wrapped as a Writable stream.
   *
   * @param {String} address                Address used for link creation
   * @param {Object} [policyOverrides]      Policy overrides used for creating this sender link
   * @param {Object} [session]              A session for the current connection that can be associated with any
   *                                        new links on that connection
   */
  createSenderStream(address: string, policyOverrides?: Policy.SenderLink, session?: Session): Promise<_SenderStream>;


  /**
   * Creates a receiver link for the given address, with optional link policy. The
   * promise returned resolves to a link that is an EventEmitter, which can be
   * used to listen for 'message' events.
   *
   * @param {String} address                An address to connect this link to.  If not provided will use default queue from connection uri.
   * @param {Object} [policyOverrides]      Policy overrides used for creating this receiver link
   * @param {String} [policyOverrides.name] Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name]
   * @param {Object} [session]              A session for the current connection that can be associated with any
   *                                        new links on that connection
   */
  createReceiver(address: string, policyOverrides?: Policy.ReceiverLink, session?: Session): Promise<ReceiverLink>;

  /**
   * Creates a receiver link wrapped as a Readable stream
   *
   * @param {String} address                Address used for link creation
   * @param {Object} [policyOverrides]      Policy overrides used for creating the receiver link
   * @param {Object} [session]              A session for the current connection that can be associated with any
   *                                        new links on that connection
   */
  createReceiverStream(address: string, policyOverrides?: Policy.ReceiverLink, session?: Session): Promise<_ReceiverStream>;

  /**
   * Disconnect tears down any existing connection with appropriate Close
   * performatives and TCP socket teardowns.
   */
  disconnect(): Promise<void>;
  
  /**
   * Registers a new SASL mechanism to handle SASL challenges during authentication. This method is only used to register the SASL mechanism
   * handler and the type of SASL mechanism used will still need to be specified in the `connect` section of the policy object.
   *
   * @param {string}      mechanism   Name of the mechanism used to authenticate - must match what the server sends in the SASL-Mechanism frame.
   * @param {SaslHandler} handler     Object that is going to handle SASL challenges and craft corresponding responses.
   *                                  The handler itself needs to implement 2 methods (getInitFrameContent and getChallengeResponseContent)
   *                                  that will be called during the SASL exchange. An example of such a SASL handler is provided in the `examples` folder.
   */
  registerSaslMechanism(mechanism: string, handler: SaslHandler): void;
}

declare namespace AMQPClient {
  export type ReceiverStream = _ReceiverStream;
  export type SenderStream = _SenderStream;
}

export = AMQPClient;