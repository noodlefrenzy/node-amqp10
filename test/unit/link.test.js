'use strict';

var constants = require('../../lib/constants'),
    frames = require('../../lib/frames'), u = require('../../lib/utilities'),

    DefaultPolicy = require('../../lib').Policy.Default,
    pu = require('../../lib/policies/policy_utilities'),

    Connection = require('../../lib/connection'),
    Session = require('../../lib/session'),

    MockServer = require('./mock_amqp');

var test = {
  policy: pu.Merge(
    {
      connect: {options: {containerId: 'test'}},
      senderLink: {attach: {name: 'sender'}},
      receiverLink: {attach: {name: 'receiver'}}
    },
    DefaultPolicy)
};

function MockBeginFrame(options, channel) {
  var begin =
      new frames.BeginFrame(u.deepMerge(options, test.policy.session.options));
  begin.channel = channel;
  return begin;
}

function src() {
  return {address: 'test-src'};
}
function tgt() {
  return {address: 'test-tgt'};
}

function MockAttachFrame(options, channel) {
  var defaults = options.role === constants.linkRole.sender ?
                     test.policy.senderLink.attach :
                     test.policy.receiverLink.attach;

  var opts = u.deepMerge({name: 'test', source: src(), target: tgt()}, options,
                         defaults);

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

describe('Link', function() {
  describe('#detach()', function() {
    var server = null;

    afterEach(function(done) {
      if (server) {
        server.teardown();
        server = null;
      }
      done();
    });

    it('should close a link by default', function(done) {
      server = new MockServer();
      server.setSequence(
        [
          constants.amqpVersion,
          new frames.OpenFrame(test.policy.connect.options),
          new MockBeginFrame({}, 1),
          new MockAttachFrame({ handle: 0, role: constants.linkRole.sender }, 1),
          new MockDetachFrame({ handle: 0, closed: true }, 1),
          new MockEndFrame(null, 1),
          new frames.CloseFrame()
        ],
        [
          constants.amqpVersion,
          new frames.OpenFrame(test.policy.connect.options),
          new MockBeginFrame({ remoteChannel: 1 }, 5),
          new MockAttachFrame({ handle: 3, role: constants.linkRole.receiver }, 5),
          new MockDetachFrame({ handle: 3, closed: true }, 5),
          new MockEndFrame(null, 5),
          new frames.CloseFrame()
        ]);

      var connection = new Connection(test.policy.connect);
      server.setup(connection);

      connection.on(Connection.Connected, function() {
        var session = new Session(connection);

        session.on(Session.Mapped, function() {
          var opts = u.deepMerge(
              {attach: {name: 'test', source: src(), target: tgt()}},
              test.policy.senderLink);
          var link = session.createLink(opts);

          link.on('detached', function() {
            session.end();
            connection.close();
          });

          link.on('attached', function() { link.detach(); });
        });

        session.begin(test.policy.session);
      });

      connection.on(Connection.Disconnected, function() { done(); });

      connection.open({protocol: 'amqp', host: 'localhost', port: server.port});
    });

    it('should detach a link without closing, if requested', function(done) {
      server = new MockServer();
      server.setSequence(
        [
          constants.amqpVersion,
          new frames.OpenFrame(test.policy.connect.options),
          new MockBeginFrame({}, 1),
          new MockAttachFrame({ handle: 0, role: constants.linkRole.sender }, 1),
          new MockDetachFrame({ handle: 0, closed: false }, 1),
          new MockEndFrame(null, 1),
          new frames.CloseFrame()
        ],
        [
          constants.amqpVersion,
          new frames.OpenFrame(test.policy.connect.options),
          new MockBeginFrame({ remoteChannel: 1 }, 5),
          new MockAttachFrame({ handle: 3, role: constants.linkRole.receiver }, 5),
          new MockDetachFrame({ handle: 3, closed: false }, 5),
          new MockEndFrame(null, 5),
          new frames.CloseFrame()
        ]);

      var connection = new Connection(test.policy.connect);
      server.setup(connection);

      connection.on(Connection.Connected, function() {
        var session = new Session(connection);

        session.on(Session.Mapped, function() {
          var opts = u.deepMerge(
              {attach: {name: 'test', source: src(), target: tgt()}},
              test.policy.senderLink);
          var link = session.createLink(opts);

          link.on('detached', function() {
            session.end();
            connection.close();
          });

          link.on('attached', function() { link.detach({closed: false}); });
        });

        session.begin(test.policy.session);
      });

      connection.on(Connection.Disconnected, function() { done(); });

      connection.open({protocol: 'amqp', host: 'localhost', port: server.port});
    });
  });
});
