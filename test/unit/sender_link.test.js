'use strict';

var chai = require('chai'),
    expect = chai.expect,
    AMQPClient = require('../../lib').Client,
    MockServer = require('./mocks').Server,

    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),

    Policy = require('../../lib/policies/policy'),
    DeliveryState = require('../../lib/types/delivery_state'),
    errors = require('../../lib/errors'),

    u = require('../../lib/utilities'),
    md = require('./mocks').Defaults,
    test = require('./test-fixture');

chai.use(require('chai-as-promised'));

var TestPolicy = new Policy({
  connect: { options: { containerId: 'test' } },
  reconnect: { retries: 0, forever: false }
});

function AttachFrameWithReceivedName(role, offset) {
  offset = offset || 1;
  role = role || constants.linkRole.sender;

  return function(prev) {
    var data = prev[prev.length - offset].duplicate();
    var lastAttach = frames.readFrame(data, { verbose: false });
    return new frames.AttachFrame(u.deepMerge({ name: lastAttach.name, role: role }, md.attach));
  };
}

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
        new AttachFrameWithReceivedName(constants.linkRole.receiver),
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
        new AttachFrameWithReceivedName(constants.linkRole.receiver),
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

  it('should reject with OverCapacityError with no link credit', function() {
    test.server.setResponseSequence([
      constants.amqpVersion,
      new frames.OpenFrame({ containerId: 'test' }),
      new frames.BeginFrame(md.begin),
      [
        new AttachFrameWithReceivedName(constants.linkRole.receiver),
        new frames.FlowFrame({
          handle: 1, deliveryCount: 0,
          nextIncomingId: 0, incomingWindow: 0,
          nextOutgoingId: 0, outgoingWindow: 0,
          linkCredit: 0
        })
      ],
      new frames.CloseFrame(md.close)
    ]);

    return test.client.connect(test.server.address())
      .then(function() { return test.client.createSender('test.link'); })
      .delay(100) // allow flow to be processed
      .then(function(sender) {
        sender.canSend = function() { return true; };
        return sender.send('test');
      })
      .then(function() { throw new Error('this should not continue'); })
      .catch(function(err) {
        expect(err).to.be.an.instanceOf(errors.OverCapacityError);
        expect(err.message).to.match(/Cannot send if no link credit/);
      })
      .then(function() { return test.client.disconnect(); });
  });

  it('should reject with OverCapacityError with no incoming window', function() {
    test.server.setResponseSequence([
      constants.amqpVersion,
      new frames.OpenFrame({ containerId: 'test' }),
      new frames.BeginFrame(md.begin),
      [
        new AttachFrameWithReceivedName(constants.linkRole.receiver),
        new frames.FlowFrame({
          handle: 1, deliveryCount: 1,
          nextIncomingId: 0, incomingWindow: 1,
          nextOutgoingId: 0, outgoingWindow: 0,
          linkCredit: 500
        })
      ],
      new frames.CloseFrame(md.close)
    ]);

    test.client = new AMQPClient(new Policy({
      connect: { options: { containerId: 'test' } },
      reconnect: { retries: 0, forever: false },
      session: { enableSessionFlowControl: true }
    }));

    return test.client.connect(test.server.address())
      .then(function() { return test.client.createSender('test.link'); })
      .delay(100) // wait for flow
      .then(function(sender) {
        sender.canSend = function() { return true; };
        return sender.send('test');
      })
      .then(function() { throw new Error('this should not continue'); })
      .catch(function(err) {
        expect(err).to.be.an.instanceOf(errors.OverCapacityError);
        expect(err.message).to.match(/over Session window capacity/);
      })
      .then(function() { return test.client.disconnect(); });
  });


  it('should reattach with non-null `unsettled` field to indicate `resume` (2.6.5)', function() {
    test.server.setResponseSequence([
      constants.amqpVersion,
      new frames.OpenFrame({ containerId: 'test' }),
      new frames.BeginFrame(md.begin),
      [
        new AttachFrameWithReceivedName(constants.linkRole.receiver),
        new frames.FlowFrame(md.flow),
        new frames.DetachFrame({ handle: 1, closed: true, error: 'com.microsoft:timeout' })
      ],
      [ // force detach from remote server, and force close of the connection
        new AttachFrameWithReceivedName(constants.linkRole.receiver, 2),
        new frames.DetachFrame({ handle: 1, closed: true }),
        new frames.EndFrame(),
        new frames.CloseFrame()
      ]
    ]);

    test.server.setExpectedFrameSequence([
      null, null, null, null,
      new frames.AttachFrame({
        channel: 1,
        handle: 0, role: false,
        name: 'test.link',
        source: { address: 'localhost' },
        target: { address: 'test.link' },
        initialDeliveryCount: 1,
        unsettled: {}
      })
    ]);

    test.client = new AMQPClient(new Policy({
      connect: { options: { containerId: 'test' } },
      reconnect: false,
      senderLink: { reattach: { retries: 5, forever: false } }
    }));

    // NOTE: The actual test here is in the expected frame sequence above, looking for the AttachFrame
    return test.client.connect(test.server.address())
      .then(function() { return test.client.createSender('test.link', { name: 'test.link' }); })
      .delay(100) // wait for flow
      .then(function() { return test.client.disconnect(); });
  });
});
