// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import _Policy = require("./policies/policy");
import _EventHub = require("./policies/event_hub_policy");
import _ServiceBusQueue = require("./policies/service_bus_queue_policy");
import _ServiceBusTopic = require("./policies/service_bus_topic_policy");
import _QpidJava = require("./policies/qpid_java_policy");
import _ActiveMQ = require("./policies/activemq_policy");
import _Utils = require('./policies/policy_utilities');

export import Client = require("./amqp_client");
export import Constants = require("./constants");
export import Errors = require("./errors");

/**
 * Policies encode many of the optional behaviors and settings of AMQP into a
 * cohesive place that could potentially be standardized, could be loaded from
 * JSON, etc.
 */
export namespace Policy {
    export import PolicyBase = _Policy;
    export const Default: _Policy;

    export const EventHub: typeof _EventHub;
    export const ServiceBusQueue: typeof _ServiceBusQueue;
    export const ServiceBusTopic: typeof _ServiceBusTopic;
    export const QpidJava: typeof _QpidJava;
    export const ActiveMQ: typeof _ActiveMQ;

    export import Utils = _Utils;

    /**
     * Create a new Policy by extending the Base Policy.
     *
     * @param overrides - Configuration overrides.
     * @returns Extended configuration.
     */
    export function merge(overrides: Options.Overrides): PolicyBase
    /**
     * Create a new Policy by extending given base policy using given overrides configuration.
     *
     * @param overrides - Configuration overrides.
     * @param base - Base configuration to extend.
     * @returns Extended configuration.
     */
    export function merge(overrides: Options.Overrides, base: PolicyBase): PolicyBase;

    /** Typings only */
    export namespace Options {
        export type Overrides = _Policy.Overrides;
        export type Reconnect = _Policy.Reconnect;
        export type Connect = _Policy.Connect;
        export type ConnectOptions = _Policy.ConnectOptions;
        export type SSLOptions = _Policy.SSLOptions;
        export type Session = _Policy.Session;
        export type SessionOptions = _Policy.SessionOptions;
        export type SenderLink = _Policy.SenderLink;
        export type SenderLinkAttach = _Policy.SenderLinkAttach;
        export type ReceiverLink = _Policy.ReceiverLink;
        export type ReceiverLinkAttach = _Policy.ReceiverLinkAttach;
        export type Address = _Policy.Address;
    }
}

export import TransportProvider = require("./transport/index");
export import DescribedType = require("./types/described_type");

/**
 * translator, which allows you to translate from node-amqp-encoder'd
 * values into the internal types used in this library. (e.g.
 * [ 'symbol', 'symval' ] => Symbol('symval') ).
 */
export import translator = require("./adapters/translate_encoder");

/**
 * Syntactic sugar for pluggable amqp10 Client behaviors.
 */
export function use(plugin: (client: typeof Client) => void): void;

// Typings only
import _ReceiverLink = require("./receiver_link");
export type ReceiverLink = _ReceiverLink;
export type Message = _ReceiverLink.Message;
export type ModifyOptions = _ReceiverLink.ModifyOptions;

import _SenderLink = require("./sender_link");
export type SenderLink = _SenderLink;
export type MessageOptions = _SenderLink.MessageOptions;
