var debug       = require('debug')('amqp10-test_connection'),
    should      = require('should'),
    builder     = require('buffer-builder'),
    Connection  = require('../lib/connection'),
    constants   = require('../lib/constants'),
    MockServer  = require('./mock_amqp'),

    OpenFrame   = require('../lib/frames/open_frame');

function openBuf() {
    var open = new OpenFrame();
    return open.outgoing();
}

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

    var assertTransitions = function(actual, expected) {
        actual.length.should.eql(expected.length-1, "Wrong number of state transitions: Actual " + JSON.stringify(actual) + " vs. Expected " + JSON.stringify(expected));
        for (var idx = 0; idx < expected.length - 1; ++idx) {
            var curTransition = expected[idx] + '=>' + expected[idx+1];
            actual[idx].should.eql(curTransition, "Wrong transition at step "+idx);
        }
    };

    describe('#_open()', function() {
        // NOTE: Only works if you have a local AMQP server running
        /*
        it('should connect to activemq', function(done) {
            var conn = new Connection();
            conn.open('amqp://localhost/');
            setTimeout(function() {
                conn.close();
                done();
            }, 1000);
        });
*/
        var server = null;

        afterEach(function (done) {
            if (server) {
                server.teardown();
                server = null;
            }
            done();
        });

        it('should connect to mock server', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqp_version, openBuf() ], [ constants.amqp_version ]);
            var conn = new Connection();
            server.setup(conn);
            var transitions = [];
            var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            conn.connSM.bind(recordTransitions);
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                assertTransitions(transitions, [ 'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'DISCONNECTED' ]);
                done();
            });
        });

        it('should cope with aggressive server handshake', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqp_version, openBuf() ], [ constants.amqp_version ], true);
            var conn = new Connection();
            server.setup(conn);
            var transitions = [];
            var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            conn.connSM.bind(recordTransitions);
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                assertTransitions(transitions, [ 'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'DISCONNECTED' ]);
                done();
            });
        });

        it('should cope with disconnects', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqp_version ], [ 'disconnect' ], true);
            var conn = new Connection();
            server.setup(conn);
            var transitions = [];
            var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            conn.connSM.bind(recordTransitions);
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                assertTransitions(transitions, [ 'DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTED' ]);
                done();
            });
        });

        it('should cope with errors', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqp_version ], [ 'error' ]);
            var conn = new Connection();
            server.setup(conn);
            var transitions = [];
            var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            conn.connSM.bind(recordTransitions);
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                assertTransitions(transitions, [ 'DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTED' ]);
                done();
            });
        });
    });
});
