'use strict';
var amqp = require('../../../lib'),
    MockServer = require('../mocks').Server,
    Builder = require('buffer-builder'),

    constants = require('../../../lib/constants'),
    frames = require('../../../lib/frames'),
    errors = require('../../../lib/errors'),
    Sasl = require('../../../lib/sasl'),
    ErrorCondition = require('../../../lib/types/error_condition'),

    expect = require('chai').expect,
    test = require('../test-fixture');

function buildInitialResponseFor(user, pass) {
  var buf = new Builder();
  buf.appendUInt8(0); // <nul>
  if (user) {
    buf.appendString(user);
    buf.appendUInt8(0); // <nul>
  }
  if (pass) {
    buf.appendString(pass);
  }
  return buf.get();
}

describe('Default Policy', function() {
  describe('#connect()', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
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

    it('should allow redefinition of parseAddress', function() {
      var policy = amqp.Policy.merge({}, amqp.Policy.DefaultPolicy);
      policy.parseAddress = function() { return { name: 'llamas' }; };
      var addr = policy.parseAddress('testing');
      expect(addr).to.eql({ name: 'llamas' });
    });

    it('should allow redefinition of parseLinkAddress', function() {
      var policy = amqp.Policy.merge({}, amqp.Policy.DefaultPolicy);
      policy.parseLinkAddress = function() { return { name: 'llamas' }; };
      var addr = policy.parseLinkAddress('testing');
      expect(addr).to.eql({ name: 'llamas' });
    });

    it('should not add a SASL layer for anonymous auth by default', function() {
      var policy = amqp.Policy.merge({
        connect: {
          options: {
            containerId: 'test-client'
          }
        }
      }, amqp.Policy.DefaultPolicy);

      test.server.setExpectedFrameSequence([
        constants.amqpVersion,
        new frames.OpenFrame({containerId: 'test-client', hostname: '127.0.0.1'})
      ]);

      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1,
          nextOutgoingId: 0,
          incomingWindow: 2147483647,
          outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      test.client = new amqp.Client(policy);
      return test.client.connect(test.server.address())
        .then(function() {
          return test.client.disconnect();
        });
    });

    it('should send SASL ANONYMOUS when requested', function() {
      var policy = amqp.Policy.merge({
        connect: {
          options: {
            containerId: 'test-client2'
          },
          saslMechanism: Sasl.Mechanism.ANONYMOUS
        }
      }, amqp.Policy.DefaultPolicy);
      test.server.setExpectedFrameSequence([
        constants.saslVersion,
        new frames.SaslInitFrame({
          mechanism: 'ANONYMOUS',
          initialResponse: buildInitialResponseFor()
        }),
        new frames.OpenFrame(
            {containerId: 'test-client2', hostname: '127.0.0.1'})
      ]);

      test.server.setResponseSequence([
        [
          constants.saslVersion,
          new frames.SaslMechanismsFrame(
              {saslServerMechanisms: ['ANONYMOUS', 'PLAIN']})
        ],
        new frames.SaslOutcomeFrame({code: constants.saslOutcomes.ok}),
        constants.amqpVersion,
        new frames.OpenFrame(policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1,
          nextOutgoingId: 0,
          incomingWindow: 2147483647,
          outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      test.client = new amqp.Client(policy);
      return test.client.connect(test.server.address())
        .then(function() {
          return test.client.disconnect();
        });
    });

    it('should disable SASL when requested (even if URI has creds)', function() {
      var policy = amqp.Policy.merge({
        connect: {
          options: {
            containerId: 'test-client3'
          },
          saslMechanism: Sasl.Mechanism.NONE
        }
      }, amqp.Policy.DefaultPolicy);
      test.server.setExpectedFrameSequence([
        constants.amqpVersion,
        new frames.OpenFrame({containerId: 'test-client3', hostname: '127.0.0.1'})
      ]);

      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame(policy.connect.options),
        new frames.BeginFrame({
          remoteChannel: 1,
          nextOutgoingId: 0,
          incomingWindow: 2147483647,
          outgoingWindow: 2147483647,
          handleMax: 4294967295
        }),
        new frames.CloseFrame({
          error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
        })
      ]);

      test.client = new amqp.Client(policy);
      var addr = 'amqp://user1:pass1@' + test.server.address().slice(7);
      return test.client.connect(addr)
        .then(function() {
          return test.client.disconnect();
        });
    });

    it('should reject connect if SASL PLAIN requested but no creds supplied',
      function() {
        var policy = amqp.Policy.merge({
          connect: {
            saslMechanism: Sasl.Mechanism.PLAIN
          }
        }, amqp.Policy.DefaultPolicy);

        test.client = new amqp.Client(policy);
        return test.client.connect(test.server.address())
          .then(function() {
            throw new Error();
          }).catch(function(err) {
            expect(err).to.be.an.instanceOf(errors.AuthenticationError);
          });
      });

    it('should reject connect if SASL RANDOM requested', function() {
      var policy = amqp.Policy.merge({
        connect: {
          saslMechanism: 'random'
        }
      }, amqp.Policy.DefaultPolicy);
      test.client = new amqp.Client(policy);
      return test.client.connect(test.server.address())
        .then(function() {
          throw new Error();
        }).catch(function(err) {
          expect(err).to.be.an.instanceOf(errors.NotImplementedError);
        });
    });
  });

});
