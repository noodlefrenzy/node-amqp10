var should      = require('should'),
    Connection  = require('../lib/connection');

describe('Connection', function() {
    describe('#_parseAddress()', function() {

        it('should match amqp(|s) no port no route', function () {
            var conn = new Connection();

            var addr = 'amqp://localhost/';
            var result = conn._parseAddress(addr);
            result.protocol.should.eql('amqp');
            result.host.should.eql('localhost');
            result.port.should.eql('5672');
            result.path.should.eql('/');

            addr = 'amqps://127.0.0.1';
            result = conn._parseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: '127.0.0.1',
                port: '5671',
                path: '/'
            });
        });

        it('should match with port and with/without route', function () {
            var conn = new Connection();

            var addr = 'amqp://localhost:1234';
            var result = conn._parseAddress(addr);
            result.should.eql({
                protocol: 'amqp',
                host: 'localhost',
                port: '1234',
                path: '/'
            });

            addr = 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments';
            result = conn._parseAddress(addr);
            result.should.eql({
                protocol: 'amqps',
                host: 'mq.myhost.com',
                port: '1235',
                path: '/myroute?with=arguments&multiple=arguments'
            });
        });
    });

    describe('#_open()', function() {
        // NOTE: Only works if you have a local AMQP server running
        it('should connect to activemq', function(done) {
            var conn = new Connection();
            conn.open('amqp://localhost/');
            setTimeout(function() {
                conn.close();
                done();
            }, 1000);
        });
    });
});
