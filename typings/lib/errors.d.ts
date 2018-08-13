// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

/** The base error all amqp10 Errors inherit from. */
export class BaseError extends Error {
    name: string;
    message: string;
    stack: string;

    constructor(message: string);
}

export class ProtocolError extends BaseError {
    name: "AmqpProtocolError";
    condition: string;
    description: string;
    errorInfo: any;

    constructor(condition: string, description?: string, errorInfo?: any);
}

/** AMQP Header is malformed. */
export class MalformedHeaderError extends BaseError {
    name: "AmqpMalformedHeaderError";

    constructor(header: string);
}

/** Method or feature is not yet implemented. */
export class NotImplementedError extends BaseError {
    name: "AmqpNotImplementedError";

    constructor(feature: string);
}

/** Payload is malformed or cannot be parsed. */
export class MalformedPayloadError extends BaseError {
    name: "AmqpMalformedPayloadError";

    constructor(payload: string);
}

/** Given object cannot be encoded successfully. */
export class EncodingError extends BaseError {
    name: "AmqpEncodingError";
    value: any;

    /**
     * @param value - The value that caused the encoding error.
     * @param message - An optional message giving context to the error.
     */
    constructor(value: any, message?: string);
}

/** Violation of AMQP flow control. */
export class OverCapacityError extends BaseError {
    name: "AmqpOverCapacityError";

    constructor(msg: string);
}

/** Authentication failure. */
export class AuthenticationError extends BaseError {
    name: "AmqpAuthenticationError";

    constructor(msg: string);
}

/** Argument missing or incorrectly defined. */
export class ArgumentError extends BaseError {
    name: "AmqpArgumentError";

    constructor(arg: string |string[]);
}

/** Invalid state. */
export class InvalidStateError extends BaseError {
    name: "AmqpInvalidStateError";

    constructor(msg: string);
}

/** Connection error. */
export class ConnectionError extends BaseError {
    name: "AmqpConnectionError";

    constructor(msg: string);
}

/** Disconnected error. */
export class DisconnectedError extends BaseError {
    name: "AmqpDisconnectedError";

    constructor(msg: string);
}

/** AMQP Version error. */
export class VersionError extends BaseError {
    name: "AmqpVersionError";

    constructor(msg: string);
}

/**
 * Invalid subject specified for receiver or sender link creation.
 */
export class InvalidSubjectError extends BaseError {
    name: "AmqpInvalidSubjectError";

    constructor(subject: string);
}

/**
 * Used to signal transport-related errors
 */
export class TransportError extends BaseError {
    name: "AmqpTransportError";

    constructor(msg: string);
}
