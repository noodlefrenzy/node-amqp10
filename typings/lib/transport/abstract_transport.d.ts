// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import { EventEmitter } from "events";
import { Address } from "../policies/policy";
import { TransportFactory, TransportProvider } from "./index";

declare abstract class AbstractTransport extends EventEmitter implements TransportFactory {
    static register(provider: TransportProvider): void;
    abstract connect(address: Address): void;
    abstract write(data: string | Buffer): void;
    abstract end(): void;
    abstract destroy(): void;
}

export = AbstractTransport;
