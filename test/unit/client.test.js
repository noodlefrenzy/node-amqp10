'use strict';

var AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,

    constants = require('../../lib/constants'),

    SaslFrames = require('../../lib/frames/sasl_frame'),
    OpenFrame = require('../../lib/frames/open_frame'),
    CloseFrame = require('../../lib/frames/close_frame'),

    DefaultPolicy = require('../../lib/policies/default_policy'),
    AMQPError = require('../../lib/types/amqp_error'),

    expect = require('chai').expect,
    test = require('./test-fixture');

DefaultPolicy.connect.options.containerId = 'test';


describe('Client', function() {
  describe('#connect()', function() {

    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new AMQPClient();
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
        constants.saslVersion,
        [
          new SaslFrames.SaslMechanisms(['PLAIN']),
          new SaslFrames.SaslOutcome({code: constants.saslOutcomes.ok})
        ],
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.config.address)
        .then(function() {
          return test.client.disconnect();
        });
    });

  });
});
