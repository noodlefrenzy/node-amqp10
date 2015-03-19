'use strict';

var debug = require('debug')('amqp10-test_connection'),
    should = require('should'),
    builder = require('buffer-builder'),

    constants = require('../lib/constants'),
    u = require('../lib/utilities'),
    tu = require('./testing_utils'),
    _ = require('lodash'),

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
      server.setSequence([
        constants.amqpVersion,
        openBuf(),
        beginBuf(null, 1),
        endBuf(null, 1),
        closeBuf()
      ], [
        constants.amqpVersion,
        openBuf(),
        beginBuf({ remoteChannel: 1 }, 5),
        [ true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test'), 5) ],
        [ true, closeBuf() ]
      ]);

      var connection = new Connection(PolicyBase.connectPolicy);
      server.setup(connection);

      var expected = {
        connection: [
          'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH','OPEN_SENT', 'OPENED',
          'CLOSE_RCVD', 'DISCONNECTED'
        ],
        session: ['UNMAPPED', 'BEGIN_SENT', 'MAPPED', 'END_RCVD', 'UNMAPPED']
      };

      var actual = {};
      var assertMultipleTransitions = function(name, transitions) {
        actual[name] = transitions;
        if (_.isEqual(actual, expected))
          done();
      };

      connection.connSM.bind(tu.assertTransitions(expected.connection, function(transitions) {
        assertMultipleTransitions('connection', transitions);
      }));

      connection.on(Connection.Connected, function() {
        var session = new Session(connection);
        session.sessionSM.bind(tu.assertTransitions(expected.session, function(transitions) {
          assertMultipleTransitions('session', transitions);
        }));

        session.begin(PolicyBase.sessionPolicy);
      });

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should emit events', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        openBuf(),
        beginBuf({}, 1),
        endBuf(null, 1),
        closeBuf()
      ], [
        constants.amqpVersion,
        openBuf(),
        beginBuf({ remoteChannel: 1 }, 5),
        [ true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test'), 5) ],
        [ true, closeBuf() ]
      ]);

      var connection = new Connection(PolicyBase.connectPolicy);
      server.setup(connection);

      var events = [];
      connection.on(Connection.Connected, function() {
        var session = new Session(connection);
        session.on(Session.Mapped, function() { events.push(Session.Mapped); });
        session.on(Session.ErrorReceived, function(err) { events.push([Session.ErrorReceived, err]); });
        session.on(Session.Unmapped, function() { events.push(Session.Unmapped); });
        session.begin(PolicyBase.sessionPolicy);
      });

      var expected = [
        'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED',
        'CLOSE_RCVD', 'DISCONNECTED'
      ];

      connection.connSM.bind(tu.assertTransitions(expected, function() {
        events.length.should.eql(3, JSON.stringify(events));
        events[0].should.eql(Session.Mapped);
        events[1][0].should.eql(Session.ErrorReceived);
        events[2].should.eql(Session.Unmapped);
        done();
      }));

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should create link', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        openBuf(),
        beginBuf({}, 1),
        attachBuf({ handle: 0, role: constants.linkRole.sender }, 1),
        detachBuf({ handle: 0}, 1), endBuf(null, 1), closeBuf()
      ], [
        constants.amqpVersion,
        openBuf(),
        beginBuf({ remoteChannel: 1 }, 5),
        attachBuf({ handle: 3, role: constants.linkRole.receiver }, 5),
        [ true, detachBuf({ handle: 3, error: new AMQPError(AMQPError.LinkDetachForced, 'test') }, 5) ],
        [ true, endBuf(new AMQPError(AMQPError.ConnectionForced, 'test'), 5) ],
        [ true, closeBuf() ]
      ]);

      var connection = new Connection(PolicyBase.connectPolicy);
      server.setup(connection);

      var expected = {
        connection: [
          'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT',
          'OPENED', 'CLOSE_RCVD', 'DISCONNECTED'
        ],
        session: ['UNMAPPED', 'BEGIN_SENT', 'MAPPED', 'END_RCVD', 'UNMAPPED'],
        link: ['ATTACHING', 'ATTACHED', 'DETACHING', 'DETACHED']
      };

      var actual = {};
      var assertMultipleTransitions = function(name, transitions) {
        actual[name] = transitions;
        if (_.isEqual(expected, actual))
          done();
      };

      connection.connSM.bind(tu.assertTransitions(expected.connection, function(transitions) {
        assertMultipleTransitions('connection', transitions);
      }));

      connection.on(Connection.Connected, function() {
        var session = new Session(connection);
        session.sessionSM.bind(tu.assertTransitions(expected.session, function(transitions) {
          assertMultipleTransitions('session', transitions);
        }));

        session.on(Session.Mapped, function() {
          var opts = u.deepMerge({ options: { name: 'test', source: src(), target: tgt() } }, PolicyBase.senderLinkPolicy);
          var link = session.attachLink(opts);
          link.linkSM.bind(tu.assertTransitions(expected.link, function(transitions) {
            assertMultipleTransitions('link', transitions);
          }));
        });

        session.begin(PolicyBase.sessionPolicy);
      });

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });
  });
});
