'use strict';

var amqp = require('../../../lib'),
    MockServer = require('../mocks').Server,
    Builder = require('buffer-builder'),

    constants = require('../../../lib/constants'),

    SaslFrames = require('../../../lib/frames/sasl_frame'),
    OpenFrame = require('../../../lib/frames/open_frame'),
    BeginFrame = require('../../../lib/frames/begin_frame'),
    CloseFrame = require('../../../lib/frames/close_frame'),

    AMQPError = require('../../../lib/types/amqp_error'),

    test = require('../test-fixture');

amqp.Policy.QpidJava.connect.options.containerId = 'test';

function buildInitialResponseFor(user, pass) {
  var buf = new Builder();
  buf.appendUInt8(0); // <nul>
  buf.appendString(user);
  buf.appendUInt8(0); // <nul>
  buf.appendString(pass);
  return buf.get();
}

describe('QpidJava Policy', function() {
  describe('#connect()', function() {
    beforeEach(function() {
      if (!!test.server) test.server = undefined;
      if (!!test.client) test.client = undefined;
      test.client = new amqp.Client(amqp.Policy.QpidJava);
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

    it('should add vhost to sasl init frame', function() {
      test.server.setExpectedFrameSequence([
        false,
        new SaslFrames.SaslInit({ mechanism: 'PLAIN', hostname: 'my-special-vhost',
          initialResponse: buildInitialResponseFor('user', 'pass') }),
        false,
        new OpenFrame({ containerId: "test", hostname:"my-special-vhost" })
      ]);

      test.server.setResponseSequence([
        [
          constants.saslVersion,
          new SaslFrames.SaslMechanisms(['PLAIN'])
        ],
        new SaslFrames.SaslOutcome({ code: constants.saslOutcomes.ok }),
        constants.amqpVersion,
        new OpenFrame(amqp.Policy.QpidJava.connect.options),
        new BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 2147483647, outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test'))
      ]);

      return test.client.connect(test.server.address('user', 'pass') + '/my-special-vhost')
        .then(function() {
          return test.client.disconnect();
        });
    });
  });

});
