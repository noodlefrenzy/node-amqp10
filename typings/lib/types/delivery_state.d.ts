// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import ForcedType = require("./forced_type");
import { Composite } from "./composite_type";

export type DeliveryState = Received | Accepted | Rejected | Released | Modified;

export class Received extends Composite implements ReceivedOptions {
    sectionNumber: number;
    sectionOffset: number;
    
    constructor(options: ReceivedOptions);
}
export interface ReceivedOptions {
    sectionNumber: number;
    sectionOffset: number;
}

export class Accepted extends Composite {
    constructor(options: ReceivedOptions);
}

export class Rejected extends Composite implements RejectedOptions {
    error: string;
    
    constructor(options: RejectedOptions);
}
export interface RejectedOptions {
    error?: string;
}

export class Released extends Composite {
    constructor(options: ReceivedOptions);
}

export class Modified extends Composite implements ModifiedOptions {
    deliveryFailed: boolean;
    undeliverableHere: boolean;
    messageAnnotations: Object;
    
    constructor(options: ModifiedOptions);
}
export interface ModifiedOptions {
    deliveryFailed: boolean;
    undeliverableHere: boolean;
    messageAnnotations: Object;
}