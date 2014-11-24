var debug       = require('debug')('amqp10-test_connection'),
    should      = require('should'),

    AMQPClient  = require('../amqp_client'),

    tu          = require('./testing_utils');

describe('AMQPClient', function() {
    describe('#ParseAddress()', function () {

        it('should match amqp(|s) no port no route', function () {
            var addr = 'amqp://localhost';
            var result = AMQPClient.ParseAddress(addr);
            result.protocol.should.eql('amqp');
            result.host.should.eql('localhost');
            result.port.should.eql('5672');
            result.path.should.eql('/');

            addr = 'amqps://127.0.0.1';
            result = AMQPClient.ParseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: '127.0.0.1',
                port: '5671',
                path: '/'
            });
        });

        it('should match with port and with/without route', function () {
            var addr = 'amqp://localhost:1234';
            var result = AMQPClient.ParseAddress(addr);
            result.should.eql({
                protocol: 'amqp',
                host: 'localhost',
                port: '1234',
                path: '/'
            });

            addr = 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments';
            result = AMQPClient.ParseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: 'mq.myhost.com',
                port: '1235',
                path: '/myroute?with=arguments&multiple=arguments'
            });
        });

        it('should match credentials no port no route', function () {
            var addr = 'amqp://username:password@my.amqp.server';
            var result = AMQPClient.ParseAddress(addr);
            result.should.eql({
                protocol: 'amqp',
                host: 'my.amqp.server',
                port: '5672',
                path: '/',
                user: 'username',
                pass: 'password'
            });
        });

        it('should match credentials with port and route', function () {
            var addr = 'amqps://username:password@192.168.1.1:1234/myroute';
            var result = AMQPClient.ParseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                user: 'username',
                pass: 'password',
                host: '192.168.1.1',
                port: '1234',
                path: '/myroute'
            });
        });

        it('should throw error on invalid address', function () {
            var addr = 'invalid://localhost';
            should.throws(function () {
                AMQPClient.ParseAddress(addr);
            }, Error, 'Should validate protocol');

            addr = 'amqp://host:non-numeric';
            should.throws(function () {
                AMQPClient.ParseAddress(addr);
            }, Error, 'Should validate port');

            addr = 'amqp://host:123:what-is-this?';
            should.throws(function () {
                AMQPClient.ParseAddress(addr);
            }, Error, 'Bad regex match');
        });
    });
});
