// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import { WindowPolicy, CreditPolicy } from "./policy_utilities";

/**
 * The default policy for amqp10 clients.
 */
declare class Policy implements Policy.Overrides {
    defaultSubjects: boolean;
    reconnect: Policy.Reconnect;
    connect: Policy.Connect;
    session: Policy.Session;
    senderLink: Policy.SenderLink;
    receiverLink: Policy.ReceiverLink;
    
    /**
     * Creates a new default Policy.
     * @param overrides - override values for the default policy
     */
    constructor(overrides?: Policy.Overrides);
    
    /**
     * Parses an address for use when connecting to an AMQP 1.0 broker
     *
     * @param address - the address to parse
     * @returns Parsed URL.
     */
    parseAddress(address: string): Policy.Address;
}

declare namespace Policy {
    /** Policy Configuration. */
    export interface Overrides {
        /**
         * support subjects in link names with the following characteristics:
         * receiver: "amq.topic/news", means a filter on the ReceiverLink will be made
         *           for messages send with a subject "news"
         *
         * sender: "amq.topic/news", will automatically set "news" as the subject for
         *         messages sent on this link, unless the user explicitly overrides
         *         the subject.
         */
        defaultSubjects?: boolean;
        
        reconnect?: Reconnect;
        
        connect?: Connect;
        
        session?: Session;
        
        senderLink?: SenderLink;
        
        receiverLink?: ReceiverLink;
    }
    
    export interface Reconnect {
        retries?: number;
        strategy?: "fibonacci" | "exponential";
        forever?: boolean;
    }
    
    export interface Connect {
        options?: ConnectOptions;
    }
    
    export interface ConnectOptions {
        containerId?: string;
        hostname?: string;
        maxFrameSize?: number;
        channelMax?: number;
        idleTimeout?: number;
        outgoingLocales?: string;
        incomingLocales?: string;
        offeredCapabilities?: any;
        desiredCapabilities?: any;
        properties?: any;
        sslOptions?: SSLOptions;
    }
    
    export interface SSLOptions {
          keyFile?: string;
          certFile?: string;
          caFile?: string;
          rejectUnauthorized?: boolean;
    }
    
    export interface Session {
        options?: SessionOptions;
        window?: WindowPolicy;
        windowQuantum?: number;
        enableSessionFlowControl?: boolean;
    }
    
    export interface SessionOptions {
        nextOutgoingId?: number;
        incomingWindow?: number;
        outgoingWindow?: number;
    }
    
    export interface SenderLink {
        /** Only for createReceiver: alias to [link.attach.name] */
        name?: string;
        attach?: SenderLinkAttach;
        callback?: "settled" | "sent";
        encoder?: any;
        reattach?: any;
    }
    
    export interface SenderLinkAttach {
        name?: string;
        role?: boolean;
        senderSettleMode?: number;
        maxMessageSize?: number;
        initialDeliveryCount?: number;
        source?: {
            address: string;
            filter?: object;
        };
        target?: {
            address: string;
            filter?: object;
        }
    }
    
    export interface ReceiverLink {
        /** Only for createReceiver: alias to [link.attach.name] */
        name?: string;
        attach?: ReceiverLinkAttach;
        credit?: CreditPolicy;
        creditQuantum?: number;
        decoder?: any;
        reattach?: any;
    }
    
    export interface ReceiverLinkAttach {
        name?: string;
        role?: boolean;
        receiverSettleMode?: number;
        maxMessageSize?: number;
        initialDeliveryCount?: number;
        source?: {
            address: string;
            filter?: object;
        };
        target?: {
            address: string;
            filter?: object;
        }
    }
    
    export interface Address {
        host: string;
        path: string;
        protocol: string;
        href: string;
        port: number;
        rootUri: string;
        
        user?: string;
        pass?: string;
    }
}

export = Policy;