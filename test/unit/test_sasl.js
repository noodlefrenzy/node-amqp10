'use strict';

var builder = require('buffer-builder'),

    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),
    DefaultPolicy = require('../../lib/policies/default_policy'),

    MockServer = require('./mock_amqp'),
    AMQPError = require('../../lib/types/amqp_error'),
    ErrorCondition = require('../../lib/types/error_condition'),

    Connection = require('../../lib/connection'),
    Sasl = require('../../lib/sasl'),

    tu = require('./../testing_utils');

DefaultPolicy.connect.options.containerId = 'test';

function MockSaslInitFrame() {
  return new frames.SaslInitFrame({
    mechanism: 'PLAIN',
    initialResponse: tu.buildBuffer([0, builder.prototype.appendString, 'user', 0, builder.prototype.appendString, 'pass'])
  });
}

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
        new frames.OpenFrame(DefaultPolicy.connect.options),
        new frames.CloseFrame()
      ], [
        constants.saslVersion,
        [ true, new frames.SaslMechanismsFrame({ saslServerMechanisms: ['PLAIN'] }) ],
        new frames.SaslOutcomeFrame({ code: constants.saslOutcomes.ok }),
        constants.amqpVersion,
        new frames.OpenFrame(DefaultPolicy.connect.options),
        [ true,
          new frames.CloseFrame({
            error: new AMQPError({ condition: ErrorCondition.ConnectionForced, description: 'test' })
          })
        ]
      ]);

      var connection = new Connection(DefaultPolicy.connect);
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
