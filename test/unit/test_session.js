'use strict';

var expect = require('chai').expect,

    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),
    u = require('../../lib/utilities'),
    tu = require('./../testing_utils'),
    _ = require('lodash'),

    DefaultPolicy = require('../../lib').Policy.Default,
    pu = require('../../lib/policies/policy_utilities'),

    Connection = require('../../lib/connection'),
    Session = require('../../lib/session'),

    ErrorCondition = require('../../lib/types/error_condition'),
    MockServer = require('./mock_amqp');

var test = {
  policy: pu.Merge({
    connect: { options: { containerId: 'test' } },
    senderLink: { attach: { name: 'sender' } },
    receiverLink: { attach: { name: 'receiver' } }
  }, DefaultPolicy)
};

function MockBeginFrame(options, channel) {
  var begin = new frames.BeginFrame(u.deepMerge(options, test.policy.session.options));
  begin.channel = channel;
  return begin;
}

function src() { return { address: 'test-src' }; }
function tgt() { return { address: 'test-tgt' }; }

function MockAttachFrame(options, channel) {
  var defaults = options.role === constants.linkRole.sender ?
      test.policy.senderLink.attach :
      test.policy.receiverLink.attach;

  var opts = u.deepMerge({
    name: 'test',
    source: src(),
    target: tgt()
  }, options, defaults);

  var attach = new frames.AttachFrame(opts);
  attach.channel = channel;
  return attach;
}

function MockDetachFrame(options, channel) {
  var detachFrame = new frames.DetachFrame(options);
  detachFrame.channel = channel;
  return detachFrame;
}

function MockEndFrame(options, channel) {
  var endFrame = new frames.EndFrame(options);
  endFrame.channel = channel;
  return endFrame;
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
        new frames.OpenFrame(test.policy.connect.options),
        new MockBeginFrame(null, 1),
        new MockEndFrame(null, 1),
        new frames.CloseFrame()
      ], [
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        new MockBeginFrame({ remoteChannel: 1 }, 5),
        [ true,
          new MockEndFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test'}
          }, 5)
        ],
        [ true, new frames.CloseFrame() ]
      ]);

      var connection = new Connection(test.policy.connect);
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

        session.begin(test.policy.session);
      });

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should emit events', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        new MockBeginFrame({}, 1),
        new MockEndFrame(null, 1),
        new frames.CloseFrame()
      ], [
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        new MockBeginFrame({ remoteChannel: 1 }, 5),
        [ true,
          new MockEndFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          }, 5)
        ],
        [ true, new frames.CloseFrame() ]
      ]);

      var connection = new Connection(test.policy.connect);
      server.setup(connection);

      var events = [];
      connection.on(Connection.Connected, function() {
        var session = new Session(connection);
        session.on(Session.Mapped, function() { events.push(Session.Mapped); });
        session.on(Session.ErrorReceived, function(err) { events.push([Session.ErrorReceived, err]); });
        session.on(Session.Unmapped, function() { events.push(Session.Unmapped); });
        session.begin(test.policy.session);
      });

      var expected = [
        'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED',
        'CLOSE_RCVD', 'DISCONNECTED'
      ];

      connection.connSM.bind(tu.assertTransitions(expected, function() {
        expect(events).to.have.length(3, JSON.stringify(events));
        expect(events[0]).to.eql(Session.Mapped);
        expect(events[1][0]).to.eql(Session.ErrorReceived);
        expect(events[2]).to.eql(Session.Unmapped);
        done();
      }));

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should create a link', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        new MockBeginFrame({}, 1),
        new MockAttachFrame({ handle: 0, role: constants.linkRole.sender }, 1),
        new MockDetachFrame({ handle: 0, closed: true }, 1),
        new MockEndFrame(null, 1),
        new frames.CloseFrame()
      ], [
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        new MockBeginFrame({ remoteChannel: 1 }, 5),
        new MockAttachFrame({ handle: 3, role: constants.linkRole.receiver }, 5),
        [ true,
          new MockDetachFrame({
            handle: 3,
            closed: true,
            error: { condition: ErrorCondition.LinkDetachForced, description: 'test' }
          }, 5)
        ],
        [ true,
          new MockEndFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          }, 5)
        ],
        [ true, new frames.CloseFrame() ]
      ]);

      var connection = new Connection(test.policy.connect);
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
        if (_.isEqual(expected, actual)) {
          done();
        }
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
          var opts = u.deepMerge({ attach: { name: 'test', source: src(), target: tgt() } }, test.policy.senderLink);
          var link = session.createLink(opts);
          link.on('errorReceived', function(err) {
//            expect(err).to.eql(errors.wrapProtocolError(new AMQPError(ErrorCondition.LinkDetachForced, 'test', '')));
          });

          link.linkSM.bind(tu.assertTransitions(expected.link, function(transitions) {
            assertMultipleTransitions('link', transitions);
          }));
        });

        session.begin(test.policy.session);
      });

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });
  });
});
