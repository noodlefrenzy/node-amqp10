'use strict';

var debug = require('debug')('amqp10-test_connection'),
    expect = require('chai').expect,

    constants = require('../../lib/constants'),

    DefaultPolicy = require('../../lib/policies/default_policy'),

    MockServer = require('./mock_amqp'),
    AMQPError = require('../../lib/types/amqp_error'),
    Source = require('../../lib/types/source_target').Source,
    Target = require('../../lib/types/source_target').Target,
    M = require('../../lib/types/message'),

    CloseFrame = require('../../lib/frames/close_frame'),
    FlowFrame = require('../../lib/frames/flow_frame'),
    OpenFrame = require('../../lib/frames/open_frame'),

    Connection = require('../../lib/connection'),
    Session = require('../../lib/session'),
    Link = require('../../lib/link'),

    _ = require('lodash'),
    tu = require('./testing_utils');

DefaultPolicy.connect.options.containerId = 'test';

describe('Connection', function() {
  describe('#_open()', function() {
    var linkName = 'test4';
    var addr = 'testtgt4';

    var server = null;

    afterEach(function(done) {
      if (server) {
        server.teardown();
        server = null;
      }
      done();
    });

    it('should connect to mock server', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options)
      ], [
        constants.amqpVersion,
        new CloseFrame()
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);

      var expected = ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'DISCONNECTED'];
      connection.connSM.bind(tu.assertTransitions(expected, function() { done(); }));
      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
      connection.on(Connection.Connected, function() {
        connection.close();
      });
    });

    it('should cope with aggressive server handshake', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options)
      ], [
        [ true, constants.amqpVersion ],
        new CloseFrame()
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);

      var expected = ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'DISCONNECTED'];
      connection.connSM.bind(tu.assertTransitions(expected, function() { done(); }));
      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should cope with disconnects', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion
      ], [
        'disconnect'
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);

      var expected = ['DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTED'];
      connection.connSM.bind(tu.assertTransitions(expected, function() { done(); }));
      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should cope with errors', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion
      ], [
        'error'
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);

      var expected = ['DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTED'];
      connection.connSM.bind(tu.assertTransitions(expected, function() { done(); }));
      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should go through open/close cycle as asked', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        new CloseFrame()
      ], [
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        [ true, new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test')) ]
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);
      var expected = [
        'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED',
        'CLOSE_RCVD', 'DISCONNECTED'
      ];
      connection.connSM.bind(tu.assertTransitions(expected, function() { done(); }));
      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should emit events', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        new CloseFrame()
      ], [
        constants.amqpVersion,
        new OpenFrame(DefaultPolicy.connect.options),
        [ true, new CloseFrame(new AMQPError(AMQPError.ConnectionForced, 'test')) ]
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);

      var events = [];
      connection.on(Connection.Connected, function() { events.push(Connection.Connected); });
      connection.on(Connection.Disconnected, function() { events.push(Connection.Disconnected); });
      connection.on(Connection.FrameReceived, function(frame) { events.push([Connection.FrameReceived, frame]); });
      connection.on(Connection.ErrorReceived, function(err) { events.push([Connection.ErrorReceived, err]); });

      var expected = [
        'DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED',
        'CLOSE_RCVD', 'DISCONNECTED'
      ];

      connection.connSM.bind(tu.assertTransitions(expected, function() {
        // NOTE: need to wait a tick for the event emitter, consider reordering
        //       event emission in Connection.prototype._processCloseFrame
        process.nextTick(function() {
          expect(events).to.have.length(3);
          expect(events[0]).to.eql(Connection.Connected);
          expect(events[1]).to.eql(Connection.Disconnected);
          expect(events[2][0]).to.eql(Connection.ErrorReceived);
          done();
        });
      }));

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });
  });
});
