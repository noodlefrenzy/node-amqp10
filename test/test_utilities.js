var debug       = require('debug')('amqp10-test_utilities'),
    should      = require('should'),

    constants   = require('../lib/constants'),
    u           = require('../lib/utilities'),
    DescribedType   = require('../lib/types/described_type'),
    Fields      = require('../lib/types/amqp_composites').Fields,
    Symbol      = require('../lib/types/symbol'),
    ST          = require('../lib/types/source_target'),
    Source      = ST.Source,
    Target      = ST.Target,
    tu          = require('./testing_utils');

describe('Utilities', function() {
    describe('#contains()', function() {
        it('should find value when contained', function() {
            u.contains([1, 2, 3], 2).should.be.true;
        });

        it('should not find value when missing', function() {
            u.contains([1, 2, 3], 4).should.be.false;
        });

        it ('should cope with null/empty arrays', function() {
            u.contains(null, 2).should.be.false;
            u.contains([], 2).should.be.false;
        });
    });

    describe('#bufferEquals()', function() {
        it('should succeed when equal', function() {
            var b1 = tu.newBuf([1, 2, 3, 4]);
            var b2 = tu.newBuf([1, 2, 3, 4]);
            u.bufferEquals(b1, b2).should.be.true;
        });
        it('should only operate on slices expected', function() {
            var b1 = tu.newBuf([1, 2, 3, 4, 5]);
            var b2 = tu.newBuf([2, 3, 4, 5, 6]);
            u.bufferEquals(b1, b2, 1, 0, 4).should.be.true;
        });
        it('should return false quickly on unequal size buffers', function() {
            // Ideally, I'd use two huge buffers, set the timeout low, and ensure the test passes in the time allotted,
            //  but that's (a) a pain, and (b) prone to sporadic failures, so just ensuring it at least gives the right answer.
            var b1 = tu.newBuf([1]);
            var b2 = tu.newBuf([1, 2]);
            u.bufferEquals(b1, b2).should.be.false;
        });
    });

    describe('#coerce()', function() {
        it('should coerce strings into symbols', function() {
            var result = u.coerce('en-US', Symbol);
            result.should.be.instanceof(Symbol);
        });

        it('should ignore if of same type', function() {
            var result = u.coerce(new Symbol('en-US'), Symbol);
            result.should.be.instanceof(Symbol);
            result.contents.should.be.type('string');
        });

        it('should coerce array of values', function() {
            var result = u.coerce(['a', 'b', 'c'], Symbol);
            result.should.be.instanceof(Array);
            result.length.should.eql(3);
            result[0].should.be.instanceof(Symbol);
        });

        it('should pass through nulls', function() {
            var result = u.coerce(null, Symbol);
            (result === null).should.be.true;
        });
    });

    describe('#deepMerge()', function() {
        it('should work for flat', function() {
            var flat = { foo: 1, bar: 2 };
            var defaults = { bar: 3, baz: 4 };
            var merged = u.deepMerge(flat, defaults);
            merged.should.eql({ foo: 1, bar: 2, baz: 4 });
        });

        it('should work for nested', function() {
            var nested = { foo: { bar: 1, baz: 2 }, bat: 3 };
            var defaults = { foo: { zoop: 1 }, dubin: { a: 1 } };
            var merged = u.deepMerge(nested, defaults);
            merged.should.eql({ foo: { bar: 1, baz: 2, zoop: 1 }, bat: 3, dubin: { a: 1 }});
        });

        // @todo Fix deepMerge to preserve object __proto__ identity.
        it('should work for nested with custom types', function() {
            var nested = { foo: { bar: new Symbol('s1') } };
            var defaults = { foo: { baz: new Symbol('s2') }, bat: new Symbol('s3') };
            var merged = u.deepMerge(nested, defaults);
            merged.bat.should.be.instanceof(Symbol);
            merged.foo.bar.should.be.instanceof(Symbol);
            merged.foo.baz.should.be.instanceof(Symbol);
        });

        it('should work for described types', function() {
            var dt = new DescribedType(new Symbol('keyname'), 'value string');
            var merged = u.deepMerge({ options: dt });
            merged.options.should.be.instanceof(DescribedType);
            merged.options.descriptor.should.be.instanceof(Symbol);
            merged.options.descriptor.contents.should.eql('keyname');
            merged.options.value.should.eql('value string');
        });

        it('should work for attach frame details', function() {
            var input = { options: {
                name: 'recv',
                    role: constants.linkRole.receiver,
                    source: new Source({
                    address: 'recv',
                    filter: new Fields({
                        'apache.org:selector-filter:string' :
                            new DescribedType(new Symbol('apache.org:selector-filter:string'),
                                "amqp.annotation.x-opt-offset > '" + 1000 + "'")
                    })
                }),
                    target: new Target({
                    address: 'localhost'
                }),
                    senderSettleMode: constants.senderSettleMode.settled,
                    receiverSettleMode: constants.receiverSettleMode.autoSettle,
                    maxMessageSize: 10000,
                    initialDeliveryCount: 1
            }};
            var merged = u.deepMerge(input);
            merged.should.eql(input);
        });

        it('should work for chains', function() {
            var last = { a: 1, b: 1, c: 1 };
            var middle = { b: 2, c: 2 };
            var first = { c: 3 };
            var merged = u.deepMerge(first, middle, last);
            merged.should.eql({ a: 1, b: 2, c: 3 });
        });
    });

    describe('#parseAddress()', function () {

        it('should match amqp(|s) no port no route', function () {
            var addr = 'amqp://localhost';
            var result = u.parseAddress(addr);
            result.protocol.should.eql('amqp');
            result.host.should.eql('localhost');
            result.port.should.eql(5672);
            result.path.should.eql('/');

            addr = 'amqps://127.0.0.1';
            result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: '127.0.0.1',
                port: 5671,
                rootUri: 'amqps://127.0.0.1:5671',
                path: '/'
            });
        });

        it('should match with port and with/without route', function () {
            var addr = 'amqp://localhost:1234';
            var result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqp',
                host: 'localhost',
                port: 1234,
                rootUri: 'amqp://localhost:1234',
                path: '/'
            });

            addr = 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments';
            result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: 'mq.myhost.com',
                port: 1235,
                rootUri: 'amqps://mq.myhost.com:1235',
                path: '/myroute?with=arguments&multiple=arguments'
            });
        });

        it('should match ip + port', function() {
            var addr = 'amqp://10.42.1.193:5672/testqueue';
            var result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqp',
                host: '10.42.1.193',
                port: 5672,
                rootUri: 'amqp://10.42.1.193:5672',
                path: '/testqueue'
            });
        });

        it('should match credentials no port no route', function () {
            var addr = 'amqp://username:password@my.amqp.server';
            var result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqp',
                host: 'my.amqp.server',
                port: 5672,
                path: '/',
                user: 'username',
                pass: 'password',
                rootUri: 'amqp://username:password@my.amqp.server:5672'
            });
        });

        it('should match credentials with port and route', function () {
            var addr = 'amqps://username:password@192.168.1.1:1234/myroute';
            var result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                user: 'username',
                pass: 'password',
                host: '192.168.1.1',
                port: 1234,
                path: '/myroute',
                rootUri: 'amqps://username:password@192.168.1.1:1234'
            });
        });

        it('should throw error on invalid address', function () {
            var addr = 'invalid://localhost';
            should.throws(function () {
                u.parseAddress(addr);
            }, Error, 'Should validate protocol');

            addr = 'amqp://host:non-numeric';
            should.throws(function () {
                u.parseAddress(addr);
            }, Error, 'Should validate port');

            addr = 'amqp://host:123:what-is-this?';
            should.throws(function () {
                u.parseAddress(addr);
            }, Error, 'Bad regex match');
        });
    });
});
