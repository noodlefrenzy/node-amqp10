// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import Link = require("./link");
import Session = require("./session");
import Policy = require("./policies/policy");
import { DeliveryState } from "./types/delivery_state";
import { BaseError } from "./errors";
import { TransferFrame } from "./frames";

type Message = ReceiverLink.Message;

declare class ReceiverLink extends Link {
    policy: Policy.ReceiverLink;
    settledMessagesSinceLastCredit: number;
    linkCredits: number;
    totalCredits: number;

    constructor(session: Session, handle: string, linkPolicy: Policy.ReceiverLink);

    addCredits(credits: number, flowOptions?: Link.FlowOptions): void;

    /**
     * Settle a message (or array of messages) with an Accepted delivery outcome
     *
     * @param {String|Array}  [message] message, or array of messages to settle
     */
    accept(message?: Message | Message[]): void;

    /**
     * Settle a message (or array of messages) with a Rejected delivery outcome
     *
     * @param {String|Array}  [message] message, or array of messages to settle
     * @param {String}        [error] error that caused the message to be rejected
     */
    reject(message?: Message | Message[], error?: string): void;

    /**
     * Settle a message (or array of messages) with a Released delivery outcome
     *
     * @param {String|Array}  [message] message, or array of messages to settle
     */
    release(message?: Message | Message[]): void;

    /**
     * Settle a message (or array of messages) with a Modified delivery outcome
     *
     * @param {String|Array}  [message] message, or array of messages to settle
     * @param {Object}        [options] options used for a Modified outcome
     */
    modify(message?: Message | Message[], options?: ReceiverLink.ModifyOptions): void;

    /**
     * Settle a message (or array of messages) with a given delivery state
     *
     * @param {String|Array}  [message] message, or array of messages to settle
     * @param {Object}        [state] outcome of message delivery
     */
    settle(message?: Message | Message[], state?: DeliveryState): void;

    /** Message event handler */
    on(event: "message", listener: (msg: Message, frame: TransferFrame) => void): this;
    /** Error event handler */
    on(event: "errorReceived", listener: (err: BaseError) => void): this;
    on(event: "creditChange" | "attached" | "detached", listener: Function): this;
    on(event: string, listener: Function): this;
}

declare namespace ReceiverLink {
    export interface Dictionary<T> {
        [key: string]: T;
    }

    export interface ModifyOptions {
        /** count the transfer as an unsuccessful delivery attempt. */
        deliveryFailed?: boolean;

        /** prevent redelivery. */
        undeliverableHere?: boolean;

        /** message attributes to combine with existing annotations. */
        messageAnnotations?: Object;
    }

    export interface Message extends Dictionary<any> {
        body?: any;

        properties?: Dictionary<any>;

        /**
         * Annotations for the message, if any.  See AMQP spec for details, and server for specific
         * annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd
         * map is given, it will be translated to appropriate internal types.  Simple maps will be converted
         * to AMQP Fields type as defined in the spec.
         */
        annotations?: Dictionary<any>;

        applicationProperties?: Dictionary<any>;
    }
}

export = ReceiverLink;
