var debug       = require('debug')('amqp10-test_utilities'),
    should      = require('should'),

    u           = require('../lib/utilities'),
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

    describe('#orDefaults', function() {
        it('should set defaults when not set', function() {
            var m = { 'a': 1 };
            var d = { 'a': 2, 'b': 3 };
            m = u.orDefaults(m, d);
            m.a.should.eql(1);
            m.b.should.eql(3);
        });
        it('should ignore defaults when set to "false" values', function() {
            var m = { 'a': 0, 'b': false };
            var d = { 'a': 1, 'b': true, 'c': 1.23 };
            m = u.orDefaults(m, d);
            m.a.should.eql(0);
            m.b.should.eql(false);
            m.c.should.eql(1.23);
        });
        it('should cope with undefined/null base map', function() {
            var d = { 'a': 1 };
            var m = u.orDefaults(undefined, d);
            m.a.should.eql(1);
            m = u.orDefaults(null, d);
            m.a.should.eql(1);
        })
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

    describe('#parseAddress()', function () {

        it('should match amqp(|s) no port no route', function () {
            var addr = 'amqp://localhost';
            var result = u.parseAddress(addr);
            result.protocol.should.eql('amqp');
            result.host.should.eql('localhost');
            result.port.should.eql('5672');
            result.path.should.eql('/');

            addr = 'amqps://127.0.0.1';
            result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: '127.0.0.1',
                port: 5671,
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
                path: '/'
            });

            addr = 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments';
            result = u.parseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: 'mq.myhost.com',
                port: 1235,
                path: '/myroute?with=arguments&multiple=arguments'
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
                pass: 'password'
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
                path: '/myroute'
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
