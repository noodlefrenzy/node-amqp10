// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import AbstractTransport = require("./abstract_transport");
import { Address } from "../policies/policy";
import { TransportProvider } from "./index";

declare class NetTransport extends AbstractTransport {
    static register(provider: TransportProvider): void;
    connect(address: Address): void;
    write(data: string | Buffer): void;
    end(): void;
    destroy(): void;
}

export = NetTransport;
