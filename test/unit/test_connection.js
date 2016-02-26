'use strict';

var expect = require('chai').expect,
    constants = require('../../lib/constants'),
    frames = require('../../lib/frames'),
    DefaultPolicy = require('../../lib/policies/default_policy'),
    MockServer = require('./mock_amqp'),
    AMQPError = require('../../lib/types/amqp_error'),
    ErrorCondition = require('../../lib/types/error_condition'),
    Connection = require('../../lib/connection'),
    tu = require('./testing_utils');

DefaultPolicy.connect.options.containerId = 'test';

describe('Connection', function() {
  describe('#_open()', function() {
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
        new frames.OpenFrame(DefaultPolicy.connect.options)
      ], [
        constants.amqpVersion,
        new frames.CloseFrame()
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
        new frames.OpenFrame(DefaultPolicy.connect.options)
      ], [
        [ true, constants.amqpVersion ],
        new frames.CloseFrame()
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
        new frames.OpenFrame(DefaultPolicy.connect.options),
        new frames.CloseFrame()
      ], [
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
        new frames.OpenFrame(DefaultPolicy.connect.options),
        new frames.CloseFrame()
      ], [
        constants.amqpVersion,
        new frames.OpenFrame(DefaultPolicy.connect.options),
        [ true,
          new frames.CloseFrame({
            error: new AMQPError({ condition: ErrorCondition.ConnectionForced, decription: 'test' })
          })
        ]
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

    it('should error when header received is invalid', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new frames.OpenFrame(DefaultPolicy.connect.options),
        new frames.CloseFrame()
      ], [
        'BOGUS_HEADER',
        new frames.OpenFrame(DefaultPolicy.connect.options),
        [ true,
          new frames.CloseFrame({
            error: new AMQPError({ condition: ErrorCondition.ConnectionForced, description: 'test' })
          })
        ]
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);

      var events = [];
      connection.on(Connection.Connected, function() { events.push(Connection.Connected); });
      connection.on(Connection.Disconnected, function() { events.push(Connection.Disconnected); });
      connection.on(Connection.FrameReceived, function(frame) { events.push([Connection.FrameReceived, frame]); });
      connection.on(Connection.ErrorReceived, function(err) { events.push([Connection.ErrorReceived, err]); });

      var expected = [
        'DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTING', 'DISCONNECTED'
      ];

      connection.connSM.bind(tu.assertTransitions(expected, function(actual) {
        // NOTE: need to wait a tick for the event emitter, consider reordering
        //       event emission in Connection.prototype._processCloseFrame

        process.nextTick(function() {
          expect(events).to.have.length(3);
          expect(events[0][0]).to.eql(Connection.ErrorReceived);
          expect(events[0][1].message).to.include('Invalid AMQP version');
          expect(events[1]).to.eql(Connection.Disconnected);
          expect(events[2]).to.eql(Connection.Disconnected);
          done();
        });
      }));

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

    it('should inform when credentials are expected', function(done) {
      server = new MockServer();
      server.setSequence([
        constants.amqpVersion,
        new frames.OpenFrame(DefaultPolicy.connect.options),
        new frames.CloseFrame()
      ], [
        constants.saslVersion,
        new frames.OpenFrame(DefaultPolicy.connect.options),
        [ true,
          new frames.CloseFrame({
            error: new AMQPError({ condition: ErrorCondition.ConnectionForced, description: 'test' })
          })
        ]
      ]);

      var connection = new Connection(DefaultPolicy.connect);
      server.setup(connection);

      var events = [];
      connection.on(Connection.Connected, function() { events.push(Connection.Connected); });
      connection.on(Connection.Disconnected, function() { events.push(Connection.Disconnected); });
      connection.on(Connection.FrameReceived, function(frame) { events.push([Connection.FrameReceived, frame]); });
      connection.on(Connection.ErrorReceived, function(err) { events.push([Connection.ErrorReceived, err]); });

      var expected = [
        'DISCONNECTED', 'START', 'HDR_SENT', 'DISCONNECTING', 'DISCONNECTED'
      ];

      connection.connSM.bind(tu.assertTransitions(expected, function(actual) {
        // NOTE: need to wait a tick for the event emitter, consider reordering
        //       event emission in Connection.prototype._processCloseFrame

        process.nextTick(function() {
          expect(events).to.have.length(3);
          expect(events[0][0]).to.eql(Connection.ErrorReceived);
          expect(events[0][1].message).to.include('Credentials Expected');
          expect(events[1]).to.eql(Connection.Disconnected);
          expect(events[2]).to.eql(Connection.Disconnected);
          done();
        });
      }));

      connection.open({ protocol: 'amqp', host: 'localhost', port: server.port });
    });

  });
});
