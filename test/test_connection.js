'use strict';

var debug = require('debug')('amqp10-test_connection'),
    should = require('should'),
    builder = require('buffer-builder'),

    constants = require('../lib/constants'),

    PolicyBase = require('../lib/policies/policy_base'),

    MockServer = require('./mock_amqp'),
    AMQPError = require('../lib/types/amqp_error'),
    Source = require('../lib/types/source_target').Source,
    Target = require('../lib/types/source_target').Target,
    M = require('../lib/types/message'),

    CloseFrame = require('../lib/frames/close_frame'),
    FlowFrame = require('../lib/frames/flow_frame'),
    OpenFrame = require('../lib/frames/open_frame'),

    Connection = require('../lib/connection'),
    Session = require('../lib/session').Session,
    Link = require('../lib/session').Link,

    tu = require('./testing_utils');

PolicyBase.connectPolicy.options.containerId = 'test';

function openBuf() {
  var open = new OpenFrame(PolicyBase.connectPolicy.options);
  return open.outgoing();
}

function closeBuf(err) {
  var close = new CloseFrame(err);
  return close.outgoing();
}

describe('Connection', function() {
  var assertTransitions = function(actual, expected) {
    actual.length.should.eql(expected.length - 1, 'Wrong number of state transitions: Actual ' + JSON.stringify(actual) + ' vs. Expected ' + JSON.stringify(expected));
    for (var idx = 0; idx < expected.length - 1; ++idx) {
      var curTransition = expected[idx] + '=>' + expected[idx + 1];
      actual[idx].should.eql(curTransition, 'Wrong transition at step '+ idx);
    }
  };

  describe('#_open()', function() {
    var linkName = 'test4';
    var addr = 'testtgt4';

    // NOTE: Only works if you have a local AMQP server running
    /*
        it('should send activemq', function(done) {
            this.timeout(0);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
            conn.open({ protocol: 'amqp', host: 'localhost', port: 5672 });
            conn.on(Connection.Connected, function() {
                var session = new Session(conn);
                session.on(Session.LinkAttached, function(link) {
                    var msg = new M.Message();
                    msg.body.push('test message');
                    session.sendMessage(link, msg, { deliveryId: 1, deliveryTag: tu.newBuf([1]) });
                    setTimeout(function() {
                        session.detachLink(link);
                    }, 500);
                });
                session.on(Session.LinkDetached, function() {
                    session.end();
                });
                session.on(Session.Mapped, function() {
                    link = session.attachLink({ name: linkName, role: constants.linkRole.sender, source: new Source({ address: null, dynamic: true }), target: new Target({ address: addr }), initialDeliveryCount: 1 });
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

    /*
        it('should receive activemq', function(done) {
            this.timeout(0);
            var conn = new Connection({ containerId: 'test', hostname: 'localhost' });
            conn.open({ protocol: 'amqp', host: 'localhost', port: 5672 });
            conn.on(Connection.Connected, function() {
                var session = new Session(conn);
                session.on(Session.LinkAttached, function(link) {
                    debugger;
                    link.on(Link.MessageReceived, function (msg) {
                        console.log('Received message: ' + JSON.stringify(msg));
                    });
                    var flow = new FlowFrame({
                        nextIncomingId: 1,
                        incomingWindow: 100,
                        nextOutgoingId: 1,
                        outgoingWindow: 100,
                        handle: link.handle,
                        linkCredit: 100000
                    });
                    flow.channel = session.channel;
                    conn.sendFrame(flow);
                    setTimeout(function() {
                        session.detachLink(link);
                    }, 10000);
                });
                session.on(Session.LinkDetached, function() {
                    session.end();
                });
                session.on(Session.Mapped, function() {
                    link = session.attachLink({ name: linkName, role: constants.linkRole.receiver,
                        source: new Source({ address: addr }), target: new Target({ address: addr }), initialDeliveryCount: 1 });
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

    afterEach(function(done) {
      if (server) {
        server.teardown();
        server = null;
      }
      done();
    });

    it('should connect to mock server', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion, openBuf()], [constants.amqpVersion]);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      conn.connSM.bind(recordTransitions);
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'DISCONNECTED']);
        done();
      });
    });

    it('should cope with aggressive server handshake', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion, openBuf()], [[true, constants.amqpVersion]]);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      conn.connSM.bind(recordTransitions);
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'DISCONNECTED']);
        done();
      });
    });

    it('should cope with disconnects', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion], ['disconnect']);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      conn.connSM.bind(recordTransitions);
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTED']);
        done();
      });
    });

    it('should cope with errors', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion], ['error']);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      conn.connSM.bind(recordTransitions);
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTED']);
        done();
      });
    });

    it('should go through open/close cycle as asked', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion, openBuf(), closeBuf()], [constants.amqpVersion, openBuf(), [true, closeBuf(new AMQPError(AMQPError.ConnectionForced, 'test'))]]);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      conn.connSM.bind(recordTransitions);
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED']);
        done();
      });
    });

    it('should emit events', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion, openBuf(), closeBuf()], [constants.amqpVersion, openBuf(), [true, closeBuf(new AMQPError(AMQPError.ConnectionForced, 'test'))]]);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      var events = [];
      conn.on(Connection.Connected, function() { events.push(Connection.Connected); });
      conn.on(Connection.Disconnected, function() { events.push(Connection.Disconnected); });
      conn.on(Connection.FrameReceived, function(frame) { events.push([Connection.FrameReceived, frame]); });
      conn.on(Connection.ErrorReceived, function(err) { events.push([Connection.ErrorReceived, err]); });
      conn.connSM.bind(recordTransitions);
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED']);
        events.length.should.eql(3);
        events[0].should.eql(Connection.Connected);
        events[1].should.eql(Connection.Disconnected);
        events[2][0].should.eql(Connection.ErrorReceived);
        done();
      });
    });
  });
});
