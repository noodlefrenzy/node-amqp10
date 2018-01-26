'use strict';

var _ = require('lodash'),
    Promise = require('bluebird'),
    amqp = require('../../lib'),
    chai = require('chai'),
    expect = chai.expect,
    Builder = require('buffer-builder'),
    AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,
    MockServerWithSasl = require('./mock_amqp'),

    Session = require('../../lib/session'),
    errors = require('../../lib/errors'),
    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),

    Policy = require('../../lib/policies/policy'),
    ErrorCondition = require('../../lib/types/error_condition'),
    m = require('../../lib/types/message'),
    DeliveryState = require('../../lib/types/delivery_state'),

    u = require('../../lib/utilities'),
    test = require('./test-fixture'),
    md = require('./mocks').Defaults;

chai.use(require('chai-as-promised'));

var TestPolicy = new Policy({
  connect: { options: { containerId: 'test' } },
  reconnect: { retries: 0, forever: false }
});

function AttachFrameWithReceivedName(role) {
  role = role || constants.linkRole.sender;
  return function(prev) {
    var rxAttach = frames.readFrame(prev[prev.length-1]);
    return new frames.AttachFrame(u.deepMerge({ name: rxAttach.name, role: role }, md.attach));
  };
}

function encodeMessagePayload(message) {
  var tmpBuf = new Builder();
  m.encodeMessage(message, tmpBuf);
  return tmpBuf.get();
}

describe('Client', function() {
  describe('#use', function() {
    it('should allow users to plug-in Client behaviors', function(done) {
      var plugin = function(Client) {
        Client.prototype.thing = function() {
          done();
        };
      };

      amqp.use(plugin);
      var client = new amqp.Client();
      client.thing();
    });

    it('should throw an error if provided a plugin that is not a function', function() {
      expect(function() { amqp.use({}); }).to.throw('Plugin is not a function');
    });
  });

  describe('#connect()', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(TestPolicy);
      test.server = new MockServer();
      return test.server.setup();
    });

    afterEach(function() {
      if (!test.server) return;
      return test.server.teardown()
        .then(function() {
          test.server = undefined;
        });
    });

    it('should connect then disconnect', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.disconnect(); });
    });

    it('should emit errors with proper conditions (issue #230)', function(done) {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new AttachFrameWithReceivedName(constants.linkRole.sender),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      test.client.connect(test.server.address())
        .tap(function() {
          test.client._connection.on('connection:errorReceived', function(err) {
            expect(err.condition).to.eql('amqp:connection:forced');
            expect(err.description).to.eql('test');
            done();
          });
        })
        .then(function() { return test.client.createReceiver('testing'); });
    });

    it('should connect and receive', function(done) {
      var message = { body: { test: 'testing' } };
      var messageBuf = encodeMessagePayload(message);
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new AttachFrameWithReceivedName(constants.linkRole.sender),
        function (prev) {
          var txFrame = new frames.TransferFrame({
            handle: 1, deliveryId: 1
          });
          txFrame.payload = messageBuf;
          return txFrame;
        },
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      test.client.connect(test.server.address())
        .then(function() { return test.client.createReceiver('testing'); })
        .then(function (rxLink) {
          rxLink.on('message', function (msg) {
            expect(msg.body).not.to.be.null;
            expect(msg.body.test).to.eql('testing');
            test.client.disconnect().then(function() {
              done();
            });
          });
        });
    });

    it('should disconnect if a framing error occurs', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new Buffer([ 0x41, 0x4d, 0x51, 0x50, 0x01, 0x01, 0x00, 0x0a ])
      ]);

      test.server.setExpectedFrameSequence([
        constants.amqpVersion,
        false,
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionFramingError, description: 'malformed header: Invalid DOFF' }
        })
      ]);

      return expect(test.client.connect(test.server.address()))
        .to.eventually.be.rejectedWith(errors.DisconnectedError);
    });

    it('should receive multi-frame messages', function(done) {
      var message = { body: { test: 'Really long message' } };
      var messageBuf = encodeMessagePayload(message);
      var buf1 = messageBuf.slice(0, 10);
      var buf2 = messageBuf.slice(10, 15);
      var buf3 = messageBuf.slice(15);

      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new AttachFrameWithReceivedName(constants.linkRole.sender),
        [
          function (prev) {
            var txFrame = new frames.TransferFrame({ handle: 1, deliveryId: 1, more: true });
            txFrame.payload = buf1;
            return txFrame;
          },
          function (prev) {
            var txFrame = new frames.TransferFrame({ handle: 1, deliveryId: 1, more: true });
            txFrame.payload = buf2;
            return txFrame;
          },
          function (prev) {
            var txFrame = new frames.TransferFrame({ handle: 1, more: false });
            txFrame.payload = buf3;
            return txFrame;
          }
        ],
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      test.client.connect(test.server.address())
        .then(function() { return test.client.createReceiver('testing'); })
        .then(function (rxLink) {
          rxLink.on('message', function (msg) {
            expect(msg.body).not.to.be.null;
            expect(msg.body.test).to.eql('Really long message');
            test.client.disconnect().then(function() {
              done();
            });
          });
        });
    });

    it('should send multi-frame messages', function() {
      var testMaxFrameSize = 512;
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(_.extend(test.client.policy.connect.options, {
          maxFrameSize: testMaxFrameSize // <-- the important part
        })),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 100000,
          outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        [
          new AttachFrameWithReceivedName(constants.linkRole.receiver),
          new frames.FlowFrame({
            handle: 1, deliveryCount: 1,
            nextIncomingId: 1, incomingWindow: 2147483647,
            nextOutgoingId: 0, outgoingWindow: 2147483647,
            linkCredit: 500
          })
        ],
        new frames.DispositionFrame({
          role: constants.linkRole.receiver, first: 1, last: 1, settled: true, batchable: false,
          state: new DeliveryState.Accepted()
        }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      // build our expected buffer segments
      var messageData = new Array(2048).join('0');
      var message = { body: messageData };
      var messageBuffer = encodeMessagePayload(message);

      // ensure expected frames are broken up the same way we break them up
      var deliveryTag = new Buffer(Number(1).toString());
      var frameOverhead = frames.TRANSFER_FRAME_OVERHEAD + deliveryTag.length;
      var idealMessageSize = testMaxFrameSize - frameOverhead;
      var messageCount = Math.ceil(messageBuffer.length / idealMessageSize);
      var expectedFrames = [], idx = 0;
      for (var i = 0; i < messageCount; ++i) {
        var frame = new frames.TransferFrame({
          channel: 1, handle: 0, deliveryId: 1, settled: false,
          deliveryTag: deliveryTag, more: ((i < messageCount - 1) ? true : false),
        });
        frame.payload = messageBuffer.slice(idx, idx + idealMessageSize);
        expectedFrames.push(frame);
        idx += idealMessageSize;
      }

      /*
        1. It is an error if the delivery-id on a continuation transfer differs
           from the delivery-id on the first transfer of a delivery.
        2. It is an error if the delivery-tag on a continuation transfer differs
           from the delivery-tag on the first transfer of a delivery.
      */
      test.server.setExpectedFrameSequence([
        false, false, false, false,
        expectedFrames[0], expectedFrames[1], expectedFrames[2], expectedFrames[3], expectedFrames[4],
        false
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createSender('test.link'); })
        .then(function(sender) { return sender.send(messageData); })
        .then(function() { return test.client.disconnect(); });
    });

    it('should connect and flow the default idleTimeout', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame({ containerId: 'server' }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      return test.client.connect(test.server.address())
        .then(function () {
          expect(test.client._connection.remote.open.idleTimeout).to.equal(constants.defaultIdleTimeout);
          return test.client.disconnect();
        });
    });

    it('should connect and track idleTimeout for local and remote', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame({ containerId: 'server', idleTimeout: 57 }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      return test.client.connect(test.server.address(), { options: { containerId: 'test', idleTimeout: 42 } })
        .then(function() {
          expect(test.client._connection.local.open.idleTimeout).to.equal(42);
          expect(test.client._connection.remote.open.idleTimeout).to.equal(57);
          return test.client.disconnect();
        });
    });

    it('should allow zero as a idleTimeout value for both local and remote', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame({ containerId: 'server', idleTimeout: 0 }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      return test.client.connect(test.server.address(), { options: { containerId: 'test', idleTimeout: 0 } })
        .then(function() {
          expect(test.client._connection.local.open.idleTimeout).to.equal(0);
          expect(test.client._connection.remote.open.idleTimeout).to.equal(0);
          return test.client.disconnect();
        });
    });

    it('should not start a heartbeat timer if remote idleTimeout is 0', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame({ containerId: 'server', idleTimeout: 0 }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      return test.client.connect(test.server.address())
        .then(function() {
          expect(test.client._connection.remote.open.idleTimeout).to.equal(0);
          expect(test.client._connection._heartbeatInterval).to.be.undefined;
          return test.client.disconnect();
        });
    });

    it('should reject send promises if links are detatched, and connection closed', function(done) {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        [
          new AttachFrameWithReceivedName(constants.linkRole.receiver),

          { delay: 100 },

          // force detach from remote server, and force close of the connection
          new frames.DetachFrame({ handle: 1, closed: true, error: 'internal-error' }),
          new frames.CloseFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          })
        ]
      ]);

      test.client.connect(test.server.address())
        .then(function() { return test.client.createSender('testing'); })
        .then(function(sender) {
          sender.send('testing')
            .then(function() { done('this should not happen'); })
            .catch(function(err) { done(); });
        });
    });

    it('should reject send promises if links are not detatched, and connection closed', function(done) {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        [
          new AttachFrameWithReceivedName(constants.linkRole.receiver),

          { delay: 100 },

          // force close of the connection
          new frames.CloseFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          })
        ]
      ]);

      test.client.connect(test.server.address())
        .then(function() { return test.client.createSender('testing'); })
        .then(function(sender) {
          sender.send('testing')
            .then(function() { done('this should not happen'); })
            .catch(function(err) { done(); });
        });
    });

    it('should reject unsettled sends on connection error', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        [
          new AttachFrameWithReceivedName(constants.linkRole.receiver),

          { delay: 1000 },

          // force detach from remote server, and force close of the connection
          new frames.CloseFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          })
        ]
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createSender('testing'); })
        .then(function(sender) {
          sender.linkCredit = 1;
          var sendPromise = sender.send('testing');
          expect(sendPromise).to.eventually.be.rejectedWith(errors.ProtocolError);
        });
    });
  });

  describe('#reconnect()', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(TestPolicy);
      test.server = new MockServer();
      return test.server.setup();
    });

    afterEach(function() {
      if (!test.server) return;
      return test.server.teardown()
        .then(function() {
          test.server = undefined;
        });
    });

    it('should resolve the connect promise on reconnect if initial connection fails', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      // restart the server after 10ms
      setTimeout(function() { return test.server.setup(); }, 10);

      var address = test.server.address();
      test.client.policy = new Policy({
        connect: { options: { containerId: 'test' } },
        reconnect: { retries: 5, strategy: 'fibonacci', forever: true }
      });

      return test.server.teardown()
        .then(function() { return test.client.connect(address); })
        .then(function() { return test.client.createSession(); })
        .then(function() { return test.client.disconnect(); });
    });

    it('should reconnect if connection lost and already connected', function() {
      test.server.setResponseSequence([
        // first connect
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),

        // second connect
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      var address = test.server.address();
      test.client.policy = new Policy({
        connect: { options: { containerId: 'test' } },
        reconnect: { retries: 5, strategy: 'fibonacci', forever: true }
      });

      return test.client.connect(address)
        // destroy the client to simulate a forced disconnect
        .then(function() { return test.server._client.destroy(); })
        .delay(250) // simulate some time to reconnect
        .then(function() { return test.client.disconnect(); });
    });
  });

  describe('#createSession()', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(TestPolicy);
      test.server = new MockServer();
      return test.server.setup();
    });

    afterEach(function() {
      if (!test.server) return;
      return test.server.teardown()
        .then(function() {
          test.server = undefined;
        });
    });

    it('should create a new session', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createSession(); })
        .then(function(session) {
          expect(session.mapped).to.be.true;
          return test.client.disconnect();
        });
    });

    it('should fail if the client hasn\'t been connected yet', function() {
      expect(function() {
        return test.client.createSession();
      }).to.throw();
    });
  });

  describe('#reattach', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(TestPolicy, {
        senderLink: { reattach: { retries: 5, forever: true } },
        receiverLink: { reattach: { retries: 5, forever: true } }
      });

      test.server = new MockServer();
      return test.server.setup();
    });

    afterEach(function() {
      if (!test.server) return;
      return test.server.teardown()
        .then(function() {
          test.server = undefined;
        });
    });

    it('should cut off link reattachment on forced remote disconnect', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new AttachFrameWithReceivedName(constants.linkRole.sender),
        [ // force detach from remote server, and force close of the connection
          new frames.DetachFrame({ handle: 1, closed: true, error: 'internal-error' }),
          new frames.CloseFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          })
        ]
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createReceiver('testing'); });
    });

    it('should not reattach after session unmapped and connection closed (issue #237)', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new AttachFrameWithReceivedName(constants.linkRole.sender),
        [ // force detach from remote server, and force close of the connection
          new frames.DetachFrame({ handle: 1, closed: true }),
          new frames.EndFrame(),
          new frames.CloseFrame()
        ]
      ]);

      var receiver;
      return test.client.connect(test.server.address())
        .then(function() {
          setTimeout(function() { test.server.closeConnection(); }, 200);
        })
        .then(function() { return test.client.createReceiver('testing'); })
        .then(function(_receiver) { receiver = _receiver; })
        .delay(500)
        .then(function() {
          expect(receiver.state()).to.eql('detached');
        });
    });
  });

  describe('#reconnect', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(TestPolicy, {
        reconnect: { retries: 5, forever: true }
      });

      test.server = new MockServer();
      return test.server.setup();
    });

    afterEach(function() {
      if (!test.server) return;
      return test.server.teardown()
        .then(function() {
          test.server = undefined;
        });
    });

    it('should wait for all existing sessions to be mapped before completing', function(done) {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new AttachFrameWithReceivedName(constants.linkRole.sender),
        new frames.BeginFrame({
          remoteChannel: 2, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        [
          new frames.BeginFrame({
            remoteChannel: 3, nextOutgoingId: 0,
            incomingWindow: 2147483647, outgoingWindow: 2147483647,
            handleMax: 4294967295
          }),
          new frames.CloseFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          }),
        ]
      ]);

      // Set up a new server to connect to on disconnect
      test.client.once('disconnected', function() {
        setImmediate(function() {
          test.server.teardown();
          test.server = new MockServer();
          test.server.setup();
          test.server.setResponseSequence([
            constants.amqpVersion,
            new frames.OpenFrame(test.client.policy.connect.options),
            [
              new frames.BeginFrame({
                remoteChannel: 1, nextOutgoingId: 0,
                incomingWindow: 2147483647, outgoingWindow: 2147483647,
                handleMax: 4294967295
              }),
              new frames.BeginFrame({
                remoteChannel: 2, nextOutgoingId: 0,
                incomingWindow: 2147483647, outgoingWindow: 2147483647,
                handleMax: 4294967295
              }),
              new frames.BeginFrame({
                remoteChannel: 3, nextOutgoingId: 0,
                incomingWindow: 2147483647, outgoingWindow: 2147483647,
                handleMax: 4294967295
              })
            ]
          ]);
        });
      });

      test.client.connect(test.server.address())
        .then(function() {
          var clientSession;
          var session1;
          var session2;
          return test.client.createReceiver('testing')
            .then(function(link) {
              clientSession = link.session;
              return test.client.createSession();
            })
            .then(function(session) {
              session1 = session;
              return test.client.createSession();
            })
            .then(function(session) {
              session2 = session;
              return [clientSession, session1, session2];
            });
        })
        .spread(function(clientSession, session1, session2) {
          var mapped = { clientSession: 0, session1: 0, session2: 0 };

          clientSession.once(Session.Mapped, function() {
            mapped.clientSession++;
          });

          session1.once(Session.Mapped, function() {
            mapped.session1++;
          });

          session2.once(Session.Mapped, function() {
            mapped.session2++;
          });

          test.client.once('connected', function() {
            expect(mapped.clientSession).to.equal(1);
            expect(mapped.session1).to.equal(1);
            expect(mapped.session2).to.equal(1);
            done();
          });
        })
        .catch(done);
    });
  });

  describe('#registerSaslMechanism()', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient(TestPolicy);
      test.server = new MockServerWithSasl();
    });

    afterEach(function(done) {
      if (test.server) {
        test.server.teardown();
        test.server = null;
      }
      if (test.client) {
        test.client = null;
      }
      done();
    });

    it('should use the registered Sasl mechanism when connecting', function (done) {
      var saslMechanism = 'TEST';
      var expectedChallenge = 'challenge';
      var expectedChallengeResponse = 'challenge-response';
      var expectedSaslInitResponse = 'init';

      var initOK = false;
      var challengeOK = false;

      var expectedSaslInitFrame = new frames.SaslInitFrame({
        mechanism: saslMechanism,
        initialResponse: expectedSaslInitResponse
      });

      var expectedSaslChallengeResponseFrame = new frames.SaslResponseFrame({
        response: expectedChallengeResponse
      });

      var saslHandler = {
        getInitFrame: function() {
          return new Promise(function(resolve) {
            initOK = true;
            resolve({
              mechanism: saslMechanism,
              initialResponse: expectedSaslInitResponse
            });
          });
        },
        getResponseFrame: function(challengeFrame) {
          return new Promise(function(resolve) {
            challengeOK = true;
            expect(challengeFrame[0].value.toString()).to.equal(expectedChallenge);
            resolve({ response: expectedChallengeResponse });
          });
        }
      };

      test.server.setSequence([
        constants.saslVersion,
        expectedSaslInitFrame,
        expectedSaslChallengeResponseFrame,
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),
        new frames.BeginFrame({ nextOutgoingId: 1, incomingWindow: 100, outgoingWindow: 100, channel: 1})
      ], [
        constants.saslVersion,
        [ true, new frames.SaslMechanismsFrame({ saslServerMechanisms: [saslMechanism] }) ],
        new frames.SaslChallengeFrame({
          challenge: expectedChallenge
        }),
        new frames.SaslOutcomeFrame({ code: constants.saslOutcomes.ok }),
        constants.amqpVersion,
        new frames.OpenFrame(test.client.policy.connect.options),

        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0,
          incomingWindow: 2147483647, outgoingWindow: 2147483647,
          handleMax: 4294967295
        })
      ]);
      test.server.setup();

      // need both the policy setting and the registerSaslMechanism call to work (since one could in theory register multiple sasl mechanism but only one can be used to connect)
      test.client.policy.connect.saslMechanism = saslMechanism;
      test.client.registerSaslMechanism(saslMechanism, saslHandler);

      test.client.connect('amqp://localhost:' + test.server.port)
        .then(function () {
          expect(initOK).to.equal(true);
          expect(challengeOK).to.equal(true);
          done();
      }).catch(function(err) {
        done(err);
      });
    });
  });
});
