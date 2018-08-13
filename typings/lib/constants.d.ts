// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

export const defaultPort: number;
export const defaultTlsPort: number;

export const minMaxFrameSize: number;
export const defaultMaxFrameSize: number;
export const defaultChannelMax: number;
export const defaultIdleTimeout: number;

export const requiredLocale: string;
export const defaultOutgoingLocales: string;
export const defaultIncomingLocales: string;

export const defaultHandleMax: number;

export const amqpVersion: Buffer;
export const saslVersion: Buffer;

export const session: {
    defaultIncomingWindow: number;
    defaultOutgoingWindow: number;
    defaultOutgoingId: number;
};

export const frameType: {
    amqp: number;
    sasl: number;
};

export const saslOutcomes: {
    ok: number;
    auth: number;
    sys: number;
    sys_perm: number;
    sys_temp: number;
    
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
};

export const linkRole: {
    sender: boolean;
    receiver: boolean;
};

export const senderSettleMode: {
    unsettled: number;
    settled: number;
    mixed: number;
};

export const receiverSettleMode: {
    autoSettle: number;
    settleOnDisposition: number;
};

export const terminusDurability: {
    none: number;
    configuration: number;
    unsettledState: number;
};

export const terminusExpiryPolicy: {
    linkDetach: "link-detach";
    sessionEnd: "session-end";
    connectionClose: "connection-close";
    never: "never";
};

export const distributionMode: {
    move: "move";
    copy: "copy";
};