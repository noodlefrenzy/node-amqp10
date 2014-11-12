var debug       = require('debug')('amqp10-test_connection'),
    should      = require('should'),
    builder     = require('buffer-builder'),

    constants   = require('../lib/constants'),

    MockServer  = require('./mock_amqp'),
    AMQPError   = require('../lib/types/amqp_error'),

    CloseFrame  = require('../lib/frames/close_frame'),
    OpenFrame   = require('../lib/frames/open_frame'),

    Connection  = require('../lib/connection'),
    Session     = require('../lib/session');

    function openBuf() {
    var open = new OpenFrame({ containerId: 'test', hostname: 'localhost' });
    return open.outgoing();
}

function closeBuf(err) {
    var close = new CloseFrame(err);
    return close.outgoing();
}

describe('Connection', function() {
    describe('#_parseAddress()', function() {

        it('should match amqp(|s) no port no route', function () {
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });

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
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });

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
            this.timeout(0);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
            conn.open('amqp://localhost/');
            conn.on(Connection.Connected, function() {
                var session = new Session(conn);
                session.on(Session.LinkAttached, function(link) {
                    session.detachLink(link);
                });
                session.on(Session.LinkDetached, function() {
                    session.end();
                });
                session.on(Session.Mapped, function() {
                    link = session.attachLink({ name: 'test', role: constants.linkRole.sender, source: { address: null, dynamic: true }, target: { address: 'testtgt' }, initialDeliveryCount: 1 });
                });
                session.on(Session.Unmapped, function() {
                    conn.close();
                });
                session.on(Session.ErrorReceived, function(err) {
                    console.log(err);
                });
                session.begin({
                    nextOutgoingId: 1,
                    incomingWindow: 100,
                    outgoingWindow: 100
                });
            });
            conn.on(Connection.Disconnected, function() {
                console.log('Disconnected');
                done();
            });
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
            server.setSequence([ constants.amqpVersion, openBuf() ], [ constants.amqpVersion ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
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
            server.setSequence([ constants.amqpVersion, openBuf() ], [ [ true, constants.amqpVersion] ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
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
            server.setSequence([ constants.amqpVersion ], [ 'disconnect' ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
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
            server.setSequence([ constants.amqpVersion ], [ 'error' ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
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

        it('should go through open/close cycle as asked', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqpVersion, openBuf(), closeBuf() ], [ constants.amqpVersion, openBuf(), [ true, closeBuf(new AMQPError(AMQPError.ConnectionForced, 'test')) ] ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
            server.setup(conn);
            var transitions = [];
            var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            conn.connSM.bind(recordTransitions);
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                assertTransitions(transitions, [ 'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED' ]);
                done();
            });
        });

        it('should emit events', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqpVersion, openBuf(), closeBuf() ], [ constants.amqpVersion, openBuf(), [ true, closeBuf(new AMQPError(AMQPError.ConnectionForced, 'test')) ] ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
            server.setup(conn);
            var transitions = [];
            var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            var events = [];
            conn.on(Connection.Connected, function() { events.push(Connection.Connected); });
            conn.on(Connection.Disconnected, function() { events.push(Connection.Disconnected); });
            conn.on(Connection.FrameReceived, function(frame) { events.push([ Connection.FrameReceived, frame ]); });
            conn.on(Connection.ErrorReceived, function(err) { events.push([ Connection.ErrorReceived, err ]); });
            conn.connSM.bind(recordTransitions);
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                assertTransitions(transitions, [ 'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED' ]);
                events.length.should.eql(3);
                events[0].should.eql(Connection.Connected);
                events[1].should.eql(Connection.Disconnected);
                events[2][0].should.eql(Connection.ErrorReceived);
                done();
            });
        });
    });
});
