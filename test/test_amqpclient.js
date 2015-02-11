var debug       = require('debug')('amqp10-test_amqpclient'),
    should      = require('should'),
    builder     = require('buffer-builder'),

    constants   = require('../lib/constants'),

    PolicyBase  = require('../lib/policies/policy_base'),

    MockServer  = require('./mock_amqp'),
    AMQPError   = require('../lib/types/amqp_error'),
    Source      = require('../lib/types/source_target').Source,
    Target      = require('../lib/types/source_target').Target,
    M           = require('../lib/types/message'),

    CloseFrame  = require('../lib/frames/close_frame'),
    FlowFrame   = require('../lib/frames/flow_frame'),
    OpenFrame   = require('../lib/frames/open_frame'),

    AMQPClient  = require('../amqp_client'),
    Connection  = require('../lib/connection'),
    Session     = require('../lib/session').Session,
    Link        = require('../lib/session').Link,

    tu          = require('./testing_utils');

PolicyBase.connectPolicy.options.containerId = 'test';

function openBuf() {
    var open = new OpenFrame(PolicyBase.connectPolicy.options);
    return open.outgoing();
}

function closeBuf(err) {
    var close = new CloseFrame(err);
    return close.outgoing();
}

describe('AMQPClient', function() {
    var assertTransitions = function(actual, expected) {
        actual.length.should.eql(expected.length-1, "Wrong number of state transitions: Actual " + JSON.stringify(actual) + " vs. Expected " + JSON.stringify(expected));
        for (var idx = 0; idx < expected.length - 1; ++idx) {
            var curTransition = expected[idx] + '=>' + expected[idx+1];
            actual[idx].should.eql(curTransition, "Wrong transition at step "+idx);
        }
    };

    describe('#connect()', function() {
        var linkName = 'test4';
        var addr = 'testtgt4';

        var server = null;

        afterEach(function (done) {
            if (server) {
                server.teardown();
                server = null;
            }
            done();
        });

        it('should connect to mock server', function(done) {
            //server = new MockServer();
            //server.setSequence([ constants.amqpVersion, openBuf(), closeBuf() ], [ constants.amqpVersion, openBuf(), [ true, closeBuf(new AMQPError(AMQPError.ConnectionForced, 'test')) ] ]);
            //var client = new AMQPClient();
            //server.setup(client);
            //var uri = 'amqp://localhost:' + server.port;
            //var transitions = [];
            //var recordTransitions = function(evt, oldS, newS) { transitions.push(oldS+'=>'+newS); };
            //client.connect(uri, function(conn_err) {
            //    client.disconnect(function () {
            //        server.assertSequence(function() {
            //            assertTransitions(transitions, ['DISCONNECTED', 'START', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'DISCONNECTED']);
            //            done();
            //        });
            //    });
            //});
            done();
        });
    });
});
