// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

/**
 * Described type, as described in the AMQP 1.0 spec as follows:
 *
 *            constructor                       untyped bytes
 *                 |                                 |
 *     +-----------+-----------+   +-----------------+-----------------+
 *     |                       |   |                                   |
 *...  0x00 0xA1 0x03 "URL" 0xA1   0x1E "http://example.org/hello-world"  ...
 *          |             |  |     |                                   |
 *          +------+------+  |     |                                   |
 *                 |         |     |                                   |
 *            descriptor     |     +------------------+----------------+
 *                           |                        |
 *                           |         string value encoded according
 *                           |             to the str8-utf8 encoding
 *                           |
 *                primitive format code
 *              for the str8-utf8 encoding
 *
 * (Note: this example shows a string-typed descriptor, which should be considered reserved)
 */
declare class DescribedType<T> {
    descriptor: number;
    value: T;

    /**
     * @constructor
     * @param descriptorOrType  Descriptor for the type (can be any valid AMQP type, including another described type), or the type itself.
     * @param value             Value of the described type (can also be any valid AMQP type, including another described type).
     */
    constructor(descriptorOrType: number | DescribedType.DescriptorType, value: T);
    
    getValue(): T;
}

declare namespace DescribedType {
    export interface DescriptorType {
        prototype: {
            Descriptor: {
                code: number;
            };
        };
    }
}

export = DescribedType;
