'use strict';

var debug = require('debug')('amqp10-test_connection'),
    should = require('should'),
    builder = require('buffer-builder'),

    constants = require('../lib/constants'),
    u = require('../lib/utilities'),

    PolicyBase = require('../lib/policies/policy_base'),

    Connection = require('../lib/connection'),
    Session = require('../lib/session').Session,

    AMQPError = require('../lib/types/amqp_error'),

    AttachFrame = require('../lib/frames/attach_frame'),
    BeginFrame = require('../lib/frames/begin_frame'),
    CloseFrame = require('../lib/frames/close_frame'),
    DetachFrame = require('../lib/frames/detach_frame'),
    EndFrame = require('../lib/frames/end_frame'),
    OpenFrame = require('../lib/frames/open_frame'),

    MockServer = require('./mock_amqp');

PolicyBase.connectPolicy.options.containerId = 'test';
PolicyBase.senderLinkPolicy.options.name = 'sender';
PolicyBase.receiverLinkPolicy.options.name = 'receiver';

function openBuf(options) {
  var open = new OpenFrame(options || PolicyBase.connectPolicy.options);
  return open.outgoing();
}

function beginBuf(options, channel) {
  var begin = new BeginFrame(u.deepMerge(options, PolicyBase.sessionPolicy.options));
  begin.channel = channel;
  return begin.outgoing();
}

function src() { return { address: 'test-src' }; }
function tgt() { return { address: 'test-tgt' }; }

function attachBuf(options, channel) {
  var defaults = options.role === constants.linkRole.sender ?
      PolicyBase.senderLinkPolicy.options :
      PolicyBase.receiverLinkPolicy.options;
  var opts = u.deepMerge({
    name: 'test',
    source: src(),
    target: tgt()
  }, options, defaults);
  var attach = new AttachFrame(opts);
  attach.channel = channel;
  return attach.outgoing();
}

function detachBuf(options, channel) {
  var detach = new DetachFrame(options);
  detach.channel = channel;
  return detach.outgoing();
}

function endBuf(err, channel) {
  var end = new EndFrame(err);
  end.channel = channel;
  return end.outgoing();
}

function closeBuf(err) {
  var close = new CloseFrame(err);
  return close.outgoing();
}

describe('Session', function() {
  var assertTransitions = function(actual, expected) {
    actual.length.should.eql(expected.length - 1, 'Wrong number of state transitions: Actual ' + JSON.stringify(actual) + ' vs. Expected ' + JSON.stringify(expected));
    for (var idx = 0; idx < expected.length - 1; ++idx) {
      var curTransition = expected[idx] + '=>' + expected[idx + 1];
      actual[idx].should.eql(curTransition, 'Wrong transition at step '+ idx);
    }
  };

  describe('#begin()', function() {
    var server = null;

    afterEach(function(done) {
      if (server) {
        server.teardown();
        server = null;
      }
      done();
    });

    it('should go through begin/end cycle as asked', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion, openBuf(), beginBuf(null, 1), endBuf(null, 1), closeBuf()],
          [constants.amqpVersion, openBuf(), beginBuf({ remoteChannel: 1 }, 5), [true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test'), 5)], [true, closeBuf()]]);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var sessionTransitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      var recordSessionTransitions = function(evt, oldS, newS) { sessionTransitions.push(oldS + '=>' + newS); };
      conn.connSM.bind(recordTransitions);
      conn.on(Connection.Connected, function() {
        var session = new Session(conn);
        session.sessionSM.bind(recordSessionTransitions);
        session.begin(PolicyBase.sessionPolicy);
      });
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED']);
        assertTransitions(sessionTransitions, ['UNMAPPED', 'BEGIN_SENT', 'MAPPED', 'END_RCVD', 'UNMAPPED']);
        done();
      });
    });

    it('should emit events', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion, openBuf(), beginBuf({}, 1), endBuf(null, 1), closeBuf()],
          [constants.amqpVersion, openBuf(), beginBuf({ remoteChannel: 1 }, 5), [true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test'), 5)], [true, closeBuf()]]);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var events = [];
      conn.on(Connection.Connected, function() {
        var session = new Session(conn);
        session.on(Session.Mapped, function() { events.push(Session.Mapped); });
        session.on(Session.ErrorReceived, function(err) { events.push([Session.ErrorReceived, err]); });
        session.on(Session.Unmapped, function() { events.push(Session.Unmapped); });
        session.begin(PolicyBase.sessionPolicy);
      });
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        events.length.should.eql(3, JSON.stringify(events));
        events[0].should.eql(Session.Mapped);
        events[1][0].should.eql(Session.ErrorReceived);
        events[2].should.eql(Session.Unmapped);
        done();
      });
    });

    it('should create link', function(done) {
      server = new MockServer();
      server.setSequence([constants.amqpVersion, openBuf(), beginBuf({}, 1), attachBuf({ handle: 0, role: constants.linkRole.sender }, 1), detachBuf({ handle: 0}, 1), endBuf(null, 1), closeBuf()],
          [constants.amqpVersion, openBuf(), beginBuf({ remoteChannel: 1 }, 5), attachBuf({ handle: 3, role: constants.linkRole.receiver }, 5),
           [true, detachBuf({ handle: 3, error: new AMQPError(AMQPError.LinkDetachForced, 'test') }, 5)],
           [true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test'), 5)], [true, closeBuf()]]);
      var conn = new Connection(PolicyBase.connectPolicy);
      server.setup(conn);
      var transitions = [];
      var sessionTransitions = [];
      var linkTransitions = [];
      var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS + '=>' + newS); };
      var recordSessionTransitions = function(evt, oldS, newS) { sessionTransitions.push(oldS + '=>' + newS); };
      var recordLinkTransitions = function(evt, oldS, newS) { linkTransitions.push(oldS + '=>' + newS); };
      conn.connSM.bind(recordTransitions);
      conn.on(Connection.Connected, function() {
        var session = new Session(conn);
        session.sessionSM.bind(recordSessionTransitions);
        session.on(Session.Mapped, function() {
          var opts = u.deepMerge({ options: { name: 'test', source: src(), target: tgt() } }, PolicyBase.senderLinkPolicy);
          var link = session.attachLink(opts);
          link.linkSM.bind(recordLinkTransitions);
        });
        session.begin(PolicyBase.sessionPolicy);
      });
      conn.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      server.assertSequence(function() {
        conn.close();
        assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED']);
        assertTransitions(sessionTransitions, ['UNMAPPED', 'BEGIN_SENT', 'MAPPED', 'END_RCVD', 'UNMAPPED']);
        assertTransitions(linkTransitions, ['ATTACHING', 'ATTACHED', 'DETACHING', 'DETACHED']);
        done();
      });
    });
  });
});
