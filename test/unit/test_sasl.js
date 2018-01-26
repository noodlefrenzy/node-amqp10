'use strict';

var builder = require('buffer-builder'),
    Promise = require('bluebird'),
    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),
    DefaultPolicy = require('../../lib').Policy.Default,
    pu = require('../../lib/policies/policy_utilities'),

    MockServer = require('./mock_amqp'),
    ErrorCondition = require('../../lib/types/error_condition'),

    Connection = require('../../lib/connection'),
    Sasl = require('../../lib/sasl/sasl'),
    SaslPlain = require('../../lib/sasl/sasl_plain'),

    tu = require('./../testing_utils'),
    errors = require('../../lib/errors'),
    expect = require('chai').expect;

function MockSaslInitFrame() {
  return new frames.SaslInitFrame({
    mechanism: 'PLAIN',
    initialResponse: tu.buildBuffer([0, builder.prototype.appendString, 'user', 0, builder.prototype.appendString, 'pass'])
  });
}

var test = {
  policy: pu.Merge({
    connect: { options: { containerId: 'test' } }
  }, DefaultPolicy)
};

describe('Sasl', function() {
  describe('constructor', function () {
    it('should throw if the either the saslMechanism or saslHandler parameters are null', function () {
      expect(function () {
        return new Sasl();
      }).to.throw(errors.NotImplementedError);
      expect(function () {
        return new Sasl('mechanism');
      }).to.throw(errors.NotImplementedError);
      expect(function () {
        return new Sasl('', {});
      }).to.throw(errors.NotImplementedError);
    });
  });

  describe('Connection.open()', function() {
    var server = null;

    afterEach(function(done) {
      if (server) {
        server.teardown();
        server = null;
      }
      done();
    });

    it('should go through sasl negotiation and then open/close cycle as asked', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.saslVersion,
        new MockSaslInitFrame(),
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        new frames.CloseFrame()
      ], [
        constants.saslVersion,
        [ true, new frames.SaslMechanismsFrame({ saslServerMechanisms: ['PLAIN'] }) ],
        new frames.SaslOutcomeFrame({ code: constants.saslOutcomes.ok }),
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        [ true,
          new frames.CloseFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          })
        ]
      ]);

      var connection = new Connection(test.policy.connect);
      server.setup(connection);

      var expected = [
        'DISCONNECTED', 'START', 'IN_SASL', 'HDR_SENT', 'HDR_EXCH',
        'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED'
      ];

      connection.connSM.bind(tu.assertTransitions(expected, function() { done(); }));
      connection.open({protocol: 'amqp', host: 'localhost', port: server.port, user: 'user', pass: 'pass'}, new Sasl('PLAIN', new SaslPlain()));
    });

    it('should use the saslHandler passed to the constructor', function (done) {
      var expectedSaslMechanism = 'TEST';
      var expectedInitialAnswer = new Buffer('initialAnswer');
      var expectedChallenge = new Buffer('challenge');
      var expectedChallengeResponse = new Buffer('challenge-response');

      var expectedSaslInitFrame = new frames.SaslInitFrame({
        mechanism: expectedSaslMechanism,
        initialResponse: expectedInitialAnswer,
        hostname: 'host'
      });

      var expectedSaslChallengeResponseFrame = new frames.SaslResponseFrame({
        response: expectedChallengeResponse
      });

      var saslHandler = {
        getInitFrame: function (credentials) {
          return new Promise(function (resolve) {
            resolve({
              mechanism: expectedSaslMechanism,
              initialResponse: expectedInitialAnswer,
              hostname: 'host'
            });
          });
        },
        getResponseFrame: function (challenge) {
          expect(challenge[0].value.toString()).to.equal(expectedChallenge.toString());
          return new Promise(function (resolve) {
            resolve({ response: expectedChallengeResponse });
          });
        }
      };

      server = new MockServer();
      server.setSequence([
        constants.saslVersion,
        expectedSaslInitFrame,
        expectedSaslChallengeResponseFrame,
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        new frames.CloseFrame()
      ], [
        constants.saslVersion,
        [ true, new frames.SaslMechanismsFrame({ saslServerMechanisms: [expectedSaslMechanism] }) ],
        new frames.SaslChallengeFrame({
          challenge: expectedChallenge
        }),
        new frames.SaslOutcomeFrame({ code: constants.saslOutcomes.ok }),
        constants.amqpVersion,
        new frames.OpenFrame(test.policy.connect.options),
        [ true,
          new frames.CloseFrame({
            error: { condition: ErrorCondition.ConnectionForced, description: 'test' }
          })
        ]
      ]);

      var connection = new Connection(test.policy.connect);
      server.setup(connection);


      var expected = [
        'DISCONNECTED', 'START', 'IN_SASL', 'HDR_SENT', 'HDR_EXCH',
        'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED'
      ];

      connection.connSM.bind(tu.assertTransitions(expected, function() { done(); }));
      connection.open({protocol: 'amqp', host: 'localhost', port: server.port}, new Sasl('TEST', saslHandler));
    });
  });
});
