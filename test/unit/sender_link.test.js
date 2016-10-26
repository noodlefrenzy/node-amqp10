'use strict';

var chai = require('chai'),
    expect = chai.expect,
    AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,

    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),

    Policy = require('../../lib/policies/policy'),
    DeliveryState = require('../../lib/types/delivery_state'),

    test = require('./test-fixture');

chai.use(require('chai-as-promised'));

var TestPolicy = new Policy({
  connect: { options: { containerId: 'test' } },
  reconnect: { retries: 0, forever: false }
});

describe('SenderLink', function() {
  describe('#send', function() {
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
        .then(function() { test.server = undefined; });
    });

    it('should reject send promises with default reason if rejected disposition provides none', function() {
      test.server.setResponseSequence([
        constants.amqpVersion,
        new frames.OpenFrame({ containerId: 'test' }),
        new frames.BeginFrame({
          remoteChannel: 1, nextOutgoingId: 0, incomingWindow: 100000,
          outgoingWindow: 2147483647, handleMax: 4294967295
        }),
        [
          function (prev) {
            var rxAttach = frames.readFrame(prev[prev.length-1]);
            return new frames.AttachFrame({
              name: rxAttach.name, handle: 1, role: constants.linkRole.receiver,
              source: {}, target: {}, initialDeliveryCount: 0
            });
          },
          new frames.FlowFrame({
            handle: 1, deliveryCount: 1,
            nextIncomingId: 1, incomingWindow: 2147483647,
            nextOutgoingId: 0, outgoingWindow: 2147483647,
            linkCredit: 500
          })
        ],
        new frames.DispositionFrame({
          role: constants.linkRole.receiver, first: 1, last: 1, settled: true, batchable: false,
          state: new DeliveryState.Rejected()
        })
      ]);

      return test.client.connect(test.server.address())
        .then(function() { return test.client.createSender('test.link'); })
        .then(function(sender) {
          var sendPromise = sender.send('llamas');
          return expect(sendPromise)
            .to.eventually.be.rejectedWith('Message was rejected');
        });
    });
  });

});
