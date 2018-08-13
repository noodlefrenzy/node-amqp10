// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import DescribedType = require("./described_type");
import ForcedType = require("./forced_type");

export abstract class Composite {
    value: any[];
    
    static fields: Field<any>[];
    static descriptor: CompositeDescriptor;
    
    constructor(fields?: Object);
    
    toDescribedType(): DescribedType<any>;
    inspect(depth?: number): string;
}

export interface CompositeConstructor {
    new <T>(): Composite;
    prototype: Composite;
    
    fields: Field<any>[];
    descriptor: CompositeDescriptor;
}

export interface CompositeDescriptor {
    code: number;
    name: string;
}

export interface Field<T> {
    name: string;
    type: string;
    mandatory?: boolean;
    default?: T;
    requires?: Constructor | (() => any);
    multiple?: boolean;
}

export type Constructor = { new (): any; };

export interface CompositeDefinition {
    name: string;
    code: number;
    fields: Field<any>[];
}

export function defineComposite(definition: CompositeDefinition): CompositeConstructor;
export function defineComposite(Base: Constructor, definition: CompositeDefinition): CompositeConstructor;

export function wrapField<T>(field: Field<T>, value?: Composite): Composite;
export function wrapField<T>(field: Field<T>, value?: T | T[] | ForcedType<T>): T | ForcedType<T>;