'use strict';

var chai = require('chai'),
    expect = chai.expect,
    AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,

    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),

    Policy = require('../../lib/policies/policy'),
    DeliveryState = require('../../lib/types/delivery_state'),

    u = require('../../lib/utilities'),
    md = require('./mocks').Defaults,
    test = require('./test-fixture');

chai.use(require('chai-as-promised'));

var TestPolicy = new Policy({
  connect: { options: { containerId: 'test' } },
  reconnect: { retries: 0, forever: false }
});

describe('SenderLink', function() {
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
      new frames.BeginFrame(md.begin),
      [
        function (prev) {
          var rxAttach = frames.readFrame(prev[prev.length-1]);
          return new frames.AttachFrame(u.deepMerge({
            name: rxAttach.name, role: constants.linkRole.receiver,
          }, md.attach));
        },
        new frames.FlowFrame(md.flow)
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

  it('should allow the source address to be overridden on send', function() {
    test.server.setResponseSequence([
      constants.amqpVersion,
      new frames.OpenFrame({ containerId: 'test' }),
      new frames.BeginFrame(md.begin),
      [
        function (prev) {
          var rxAttach = frames.readFrame(prev[prev.length-1]);
          return new frames.AttachFrame(u.deepMerge({
            name: rxAttach.name, role: constants.linkRole.receiver
          }, md.attach));
        },
        new frames.FlowFrame(md.flow)
      ],
      new frames.CloseFrame(md.close)
    ]);

    var sourceAddress = 'customSourceAddress';
    return test.client.connect(test.server.address())
      .then(function() {
        return test.client.createSender('test.link', {
          attach: { source: { address: sourceAddress } }
        });
      })
      .then(function(sender) {
        expect(sender.policy.attach.source.address).to.eql(sourceAddress);
        return test.client.disconnect();
      });
  });

});
