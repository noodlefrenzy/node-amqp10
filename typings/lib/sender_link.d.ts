// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import Link = require("./link");
import Session = require("./session");
import Policy = require("./policies/policy");
import { DeliveryState } from "./types/delivery_state";
import { BaseError } from "./errors";

declare class SenderLink extends Link {
    policy: Policy.SenderLink;
    initialDeliveryCount: number;

    constructor(session: Session, handle: string, linkPolicy: Policy.SenderLink);

    canSend(): boolean;

    /**
     * Sends the given message, with the given options on this link
     *
     * @param {*} msg               Message to send.  Will be encoded using sender link policy's encoder.
     * @param {*} [options]         An object of options to attach to the message including: annotations, properties,
                                    and application properties
    * @param options.annotations   Annotations for the message, if any.  See AMQP spec for details, and server for specific
    *                               annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd
    *                               map is given, it will be translated to appropriate internal types.  Simple maps will be converted
    *                               to AMQP Fields type as defined in the spec.
    */
    send(message: any, options?: SenderLink.MessageOptions | Object): Promise<DeliveryState>;

    /** Error event handler */
    on(event: "errorReceived", listener: (err: BaseError) => void): this;
    on(event: "creditChange" | "attached" | "detached", listener: Function): this;
    on(event: string, listener: Function): this;
}

declare namespace SenderLink {
    export interface Dictionary<T> {
        [key: string]: T;
    }

    export interface MessageOptions extends Dictionary<any> {
        body: any;

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

export = SenderLink;
