'use strict';

var builder = require('buffer-builder'),

    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),
    DefaultPolicy = require('../../lib').Policy.Default,
    pu = require('../../lib/policies/policy_utilities'),

    MockServer = require('./mock_amqp'),
    ErrorCondition = require('../../lib/types/error_condition'),

    Connection = require('../../lib/connection'),
    Sasl = require('../../lib/sasl'),

    tu = require('./../testing_utils');

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
      connection.open({protocol: 'amqp',host: 'localhost', port: server.port, user: 'user', pass: 'pass'}, new Sasl());
    });
  });
});
