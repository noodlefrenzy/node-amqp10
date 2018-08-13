/**
 * Types only
 */
export interface Frame {
    type: number;
}

export interface OpenFrame {
    containerId: string;
    hostname: string;
    maxFrameSize: number;
    channelMax: number;
    idleTimeout: number;
    outgoingLocales: string;
    incomingLocales: string;
    offeredCapabilities: string;
    desiredCapabilities: string;
    properties: Object;
}

export interface BeginFrame {
    remoteChannel: number;
    nextOutgoingId: number;
    incomingWindow: number;
    outgoingWindow: number;
    handleMax: number;
    offeredCapabilities: string;
    desiredCapabilities: string;
    properties: Object;
}

export interface AttachFrame {
    name: string;
    handle: string;
    role: boolean;
    sndSettleMode: string;
    rcvSettleMode: string;
    source: any;
    target: any;
    unsettled: { [key: string]: any };
    incompleteUnsettled: boolean;
    initialDeliveryCount: number;
    maxMessageSize: number;
    offeredCapabilities: string;
    desiredCapabilities: string;
    properties: Object;
}

export interface FlowFrame {
    nextIncomingId: number;
    incomingWindow: number;
    nextOutgoingId: number;
    outgoingWindow: number;
    handle: string;
    deliveryCount: number;
    linkCredit: number;
    available: number;
    drain: boolean;
    echo: boolean;
    properties: Object;
}

export interface TransferFrame {
    handle: string;
    deliveryId: number;
    deliveryTag: number;
    messageFormat: number;
    settled: boolean;
    more: boolean;
    rcvSettleMode: number;
    state: any;
    resume: boolean;
    aborted: boolean;
    batchable: boolean;
}

export interface DispositionFrame {
    role: boolean;
    first: number;
    last: number;
    settled: number;
    state: any;
    batchable: boolean;
}

export interface DetachFrame {
    handle: string;
    closed: boolean;
    error: any;
}

export interface EndFrame {
    error: any;
}

export interface CloseFrame {
    error: any;
}

// SASL frames
export interface SaslMechanismsFrame {
    saslServerMechanisms: string;
}

export interface SaslInitFrame {
    mechanism: string;
    initialResponse: Buffer; // Is this right?
    hostname: string;
}

export interface SaslChallengeFrame {
    challenge: Buffer; // Is this right?
}

export interface SaslResponseFrame {
    response: Buffer; // Is this right?
}

export interface SaslOutcomeFrame {
    code: number;
    additionalData: Buffer;
}
