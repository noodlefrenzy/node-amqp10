// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import { EventEmitter } from "events";
import { Address } from "../policies/policy";

// declare class TransportProvider implements provider.TransportProvider {
//     registerTransport(protocol: string, transportFactory: provider.TransportFactory): void;
//     getTransportFor(protocol: string): provider.TransportFactory;
// }

declare const provider: provider.TransportProvider;

declare namespace provider {
        
    export interface TransportProvider {
        registerTransport(protocol: string, transportFactory: TransportFactory): void;
        getTransportFor(protocol: string): TransportFactory;
    }

    export interface TransportFactory extends EventEmitter {
        connect(address: Address): void;
        write(data: string | Buffer): void;
        end(): void;
        destroy(): void;
    }
}

export = provider;