var debug       = require('debug')('amqp10-test_connection'),
    should      = require('should'),
    builder     = require('buffer-builder'),

    constants   = require('../lib/constants'),

    Connection  = require('../lib/connection'),
    Session     = require('../lib/session'),

    AMQPError   = require('../lib/types/amqp_error'),

    AttachFrame = require('../lib/frames/attach_frame'),
    BeginFrame  = require('../lib/frames/begin_frame'),
    CloseFrame  = require('../lib/frames/close_frame'),
    EndFrame    = require('../lib/frames/end_frame'),
    OpenFrame   = require('../lib/frames/open_frame'),

    MockServer  = require('./mock_amqp');

function openBuf(options) {
    var open = new OpenFrame(options || { containerId: 'test', hostname: 'localhost' });
    return open.outgoing();
}

function beginBuf(options) {
    var opts = { nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100 };
    for (var prop in options) { opts[prop] = options[prop]; }
    var begin = new BeginFrame(opts);
    return begin.outgoing();
}

function endBuf(err) {
    var end = new EndFrame(err);
    return end.outgoing();
}

function closeBuf(err) {
    var close = new CloseFrame(err);
    return close.outgoing();
}

describe('Session', function() {
    var assertTransitions = function(actual, expected) {
        actual.length.should.eql(expected.length-1, "Wrong number of state transitions: Actual " + JSON.stringify(actual) + " vs. Expected " + JSON.stringify(expected));
        for (var idx = 0; idx < expected.length - 1; ++idx) {
            var curTransition = expected[idx] + '=>' + expected[idx+1];
            actual[idx].should.eql(curTransition, "Wrong transition at step "+idx);
        }
    };

    describe('#begin()', function() {
        var server = null;

        afterEach(function (done) {
            if (server) {
                server.teardown();
                server = null;
            }
            done();
        });

        it('should go through begin/end cycle as asked', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqpVersion, openBuf(), beginBuf(), endBuf(), closeBuf() ],
                [ constants.amqpVersion, openBuf(), beginBuf({ remoteChannel: 5 }), [ true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test')) ], [ true, closeBuf()] ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
            server.setup(conn);
            var transitions = [];
            var sessionTransitions = [];
            var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            var recordSessionTransitions = function(evt, oldS, newS) { sessionTransitions.push(oldS+'=>'+newS); };
            conn.connSM.bind(recordTransitions);
            conn.on(Connection.Connected, function() {
                var session = new Session(conn);
                session.sessionSM.bind(recordSessionTransitions);
                session.begin({ nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100 });
            });
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                assertTransitions(transitions, [ 'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED' ]);
                assertTransitions(sessionTransitions, [ 'UNMAPPED', 'BEGIN_SENT', 'MAPPED', 'END_RCVD', 'UNMAPPED' ]);
                done();
            });
        });

        it('should emit events', function(done) {
            server = new MockServer();
            server.setSequence([ constants.amqpVersion, openBuf(), beginBuf(), endBuf(), closeBuf() ],
                [ constants.amqpVersion, openBuf(), beginBuf({ remoteChannel: 5 }), [ true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test')) ], [ true, closeBuf()] ]);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
            server.setup(conn);
            var events = [];
            conn.on(Connection.Connected, function() {
                var session = new Session(conn);
                session.on(Session.Mapped, function() { events.push(Session.Mapped); });
                session.on(Session.ErrorReceived, function(err) { events.push([ Session.ErrorReceived, err ]); });
                session.on(Session.Unmapped, function() { events.push(Session.Unmapped); });
                session.begin({ nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100 });
            });
            conn.open('amqp://localhost:'+server.port);
            server.assertSequence(function() {
                conn.close();
                events.length.should.eql(3, JSON.stringify(events));
                events[0].should.eql(Session.Mapped);
                events[1][0].should.eql(Session.ErrorReceived);
                events[2].should.eql(Session.Unmapped);
                done();
            });
        });
    });
});
