// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

/**
 * ForcedType coerces the encoder to encode to the given type, regardless of what it might think.
 */
declare class ForcedType<T> {
    /**
     * Create a new ForcedType instance.
     *  
     * @param typeName          Symbolic name or specific code (e.g. 'long', or 0xA0)
     * @param value             Value to encode, should be compatible or bad things will occur
     * @constructor
     */
    constructor(typeName: string, value: T);
    
    inspect(depth?: number): string;
    
    valueOf(): T;
}

export = ForcedType;
