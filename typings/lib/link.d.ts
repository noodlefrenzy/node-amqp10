// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import { EventEmitter } from "events";
import Session = require("./session");
import Policy = require("./policies/policy");

type LinkPolicy = Policy.SenderLink | Policy.ReceiverLink;

declare class Link extends EventEmitter {
    policy: LinkPolicy;
    session: Session;
    handle: string;
    remote: Link.Remote;
    deliveryCount: number;
    linkSM: any;

    name: string;
    role: boolean;
    linkCredit: number;
    totalCredits: number;
    available: number;
    drain: boolean;

    /** On receipt of a message.  Message payload given as argument. */
    static MessageReceived: "message";

    /** Since "error" events are "special" in Node (as in halt-the-process special),
     * using a custom event for errors we receive from the other endpoint. Provides
     * received AMQPError as an argument.
     */
    static ErrorReceived: "errorReceived";

    /** On link credit changed. */
    static CreditChange: "creditChange";

    /** On completion of detach. */
    static Attached: "attached";

    /** On completion of detach. */
    static Detached: "detached";

    constructor(session: Session, handle: string, linkPolicy: LinkPolicy);

    state(): string;
    attach(): void;
    detach(options?: Link.DetachOptions): Promise<void>;
    forceDetach(): void;
    flow(flowOptions?: Link.FlowOptions): void;
    shouldReatttach(): boolean;
}

declare namespace Link {
    export interface Remote {
        handle: string;
        attach: any;
        detach: any;
    }

    export interface FlowOptions {
        channel?: string;
        handle?: string;
        linkCredit?: number;
        nextIncomingId?: string;
        incomingWindow?: number;
        nextOutgoingId?: string;
        outgoingWindow?: number;
        available?: boolean;
        deliveryCount?: number;
        drain?: boolean;
    }

    export interface DetachOptions {
        handle?: string;
        channel?: string;
        closed?: boolean;
        error?: any;
    }
}

export = Link;
