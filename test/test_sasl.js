var debug       = require('debug')('amqp10-test_sasl'),
    should      = require('should'),
    builder     = require('buffer-builder'),

    constants   = require('../lib/constants'),

    MockServer  = require('./mock_amqp'),
    AMQPError   = require('../lib/types/amqp_error'),
    Symbol      = require('../lib/types/symbol'),
    Source      = require('../lib/types/source_target').Source,
    Target      = require('../lib/types/source_target').Target,
    M           = require('../lib/types/message'),

    CloseFrame  = require('../lib/frames/close_frame'),
    FlowFrame   = require('../lib/frames/flow_frame'),
    OpenFrame   = require('../lib/frames/open_frame'),
    SaslFrames  = require('../lib/frames/sasl_frame'),

    Connection  = require('../lib/connection'),
    Session     = require('../lib/session').Session,
    Link        = require('../lib/session').Link,
    Sasl        = require('../lib/sasl'),

    tu          = require('./testing_utils');

function initBuf() {
    var init = new SaslFrames.SaslInit({
        mechanism: new Symbol('PLAIN'),
        initialResponse: tu.newBuf([0, builder.prototype.appendString, 'user', 0, builder.prototype.appendString, 'pass'])
    });
    return init.outgoing();
}

function mechanismsBuf() {
    var mech = new SaslFrames.SaslMechanisms(['PLAIN']);
    return mech.outgoing();
}

function outcomeBuf() {
    var outcome = new SaslFrames.SaslOutcome({code: constants.saslOutcomes.ok});
    return outcome.outgoing();
}

function openBuf() {
    var open = new OpenFrame({containerId: 'test', hostname: 'localhost'});
    return open.outgoing();
}

function closeBuf(err) {
    var close = new CloseFrame(err);
    return close.outgoing();
}

describe('Sasl', function () {
    var assertTransitions = function (actual, expected) {
        actual.length.should.eql(expected.length - 1, "Wrong number of state transitions: Actual " + JSON.stringify(actual) + " vs. Expected " + JSON.stringify(expected));
        for (var idx = 0; idx < expected.length - 1; ++idx) {
            var curTransition = expected[idx] + '=>' + expected[idx + 1];
            actual[idx].should.eql(curTransition, "Wrong transition at step " + idx);
        }
    };

    describe('Connection.open()', function () {
        var server = null;

        afterEach(function (done) {
            if (server) {
                server.teardown();
                server = null;
            }
            done();
        });

        var linkName = 'test';
        var recvAddr = 'milanz-hub/ConsumerGroups/$default/Partitions/1';
        var sendAddr = 'milanz-hub/Partitions/1';

        /*
        it('should send eventhub', function(done) {
            this.timeout(0);
            var conn = new Connection({
                containerId: 'test',
                hostname: 'milanz-hub-ns.servicebus.windows.net',
                idleTimeout: 120000,
                sslOptions: {
                    keyFile: 'E:/dev/git_ws/node_modules/node-amqp-1-0/ehtest-key.pem',
                    certFile: 'E:/dev/git_ws/node_modules/node-amqp-1-0/ehtest-cert.pem'
                }
            });
            conn.open({
                protocol: 'amqps',
                host: 'milanz-hub-ns.servicebus.windows.net',
                port: 5671,
                user: 'Publisher',
                pass: ''
            }, new Sasl());
            conn.on(Connection.Connected, function() {
                var session = new Session(conn);
                session.on(Session.LinkAttached, function(link) {
                    link.on(Link.CreditChange, function(c) {
                        if (c > 0) {
                            var msg = new M.Message();
                            msg.body.push('test message');
                            session.sendMessage(link, msg, { deliveryId: 1, deliveryTag: tu.newBuf([1]) });
                        } else {
                            console.log('Link has no capacity');
                        }
                    });
                    setTimeout(function() {
                        session.detachLink(link);
                    }, 5000);
                });
                session.on(Session.LinkDetached, function() {
                    session.end();
                });
                session.on(Session.Mapped, function() {
                    link = session.attachLink({
                        name: linkName+'s',
                        role: constants.linkRole.sender,
                        source: new Source({
                            address: 'localhost'
                        }),
                        target: new Target({
                            address: sendAddr
                        }),
                        senderSettleMode: constants.senderSettleMode.settled,
                        receiverSettleMode: constants.receiverSettleMode.autoSettle,
                        maxMessageSize: 10000,
                        initialDeliveryCount: 1
                    });
                });
                session.on(Session.Unmapped, function() {
                    conn.close();
                });
                session.on(Session.ErrorReceived, function(err) {
                    console.log(err);
                });
                session.begin({
                    nextOutgoingId: 1,
                    incomingWindow: 100,
                    outgoingWindow: 100
                });
            });
            conn.on(Connection.Disconnected, function() {
                console.log('Disconnected');
                done();
            });
        });
        */

        /*
        it('should receive eventhub', function (done) {
            this.timeout(0);
            var conn = new Connection({
                containerId: 'test',
                hostname: 'milanz-hub-ns.servicebus.windows.net',
                idleTimeout: 120000,
                sslOptions: {
                    keyFile: 'E:/dev/git_ws/node_modules/node-amqp-1-0/ehtest-key.pem',
                    certFile: 'E:/dev/git_ws/node_modules/node-amqp-1-0/ehtest-cert.pem'
                }
            });
            conn.open({
                protocol: 'amqps',
                host: 'milanz-hub-ns.servicebus.windows.net',
                port: 5671,
                user: 'Subscriber',
                pass: ''
            }, new Sasl());
            conn.on(Connection.Connected, function () {
                var session = new Session(conn);
                session.on(Session.LinkAttached, function (link) {
                    link.on(Link.MessageReceived, function (msg) {
                        console.log('Received message: ' + JSON.stringify(msg));
                    });
                    var flow = new FlowFrame({
                        nextIncomingId: 1,
                        incomingWindow: 100,
                        nextOutgoingId: 1,
                        outgoingWindow: 100,
                        handle: link.handle,
                        linkCredit: 10
                    });
                    flow.channel = session.channel;
                    conn.sendFrame(flow);
                    setTimeout(function () {
                        session.detachLink(link);
                    }, 7000);
                });
                session.on(Session.LinkDetached, function () {
                    session.end();
                });
                session.on(Session.Mapped, function () {
                    link = session.attachLink({
                        name: linkName+'r',
                        role: constants.linkRole.receiver,
                        source: new Source({
                            address: recvAddr
                        }),
                        target: new Target({
                            address: 'localhost'
                        }),
                        senderSettleMode: constants.senderSettleMode.settled,
                        receiverSettleMode: constants.receiverSettleMode.autoSettle,
                        maxMessageSize: 10000,
                        initialDeliveryCount: 1
                    });
                });
                session.on(Session.Unmapped, function () {
                    conn.close();
                });
                session.on(Session.ErrorReceived, function (err) {
                    console.log(err);
                });
                session.begin({
                    nextOutgoingId: 1,
                    incomingWindow: 100,
                    outgoingWindow: 100
                });
            });
            var isDone = false;
            conn.on(Connection.Disconnected, function () {
                console.log('Disconnected');
                if (!isDone) {
                    done();
                    isDone = true;
                }
            });
        });
        */

        it('should go through sasl negotiation and then open/close cycle as asked', function (done) {
            server = new MockServer();
            server.setSequence(
                [constants.saslVersion, initBuf(), constants.amqpVersion, openBuf(), closeBuf()],
                [constants.saslVersion, [true, mechanismsBuf()], outcomeBuf(), constants.amqpVersion, openBuf(), [true, closeBuf(new AMQPError(AMQPError.ConnectionForced, 'test'))]]);
            var conn = new Connection({containerId: 'test', hostname: 'localhost'});
            server.setup(conn);
            var transitions = [];
            var recordTransitions = function (evt, oldS, newS) {
                transitions.push(oldS + '=>' + newS);
            };
            conn.connSM.bind(recordTransitions);
            conn.open({protocol: 'amqp', host: 'localhost', port: server.port, user: 'user', pass: 'pass'}, new Sasl());
            server.assertSequence(function () {
                conn.close();
                assertTransitions(transitions, ['DISCONNECTED', 'START', 'IN_SASL', 'HDR_SENT', 'HDR_EXCH', 'OPEN_SENT', 'OPENED', 'CLOSE_RCVD', 'DISCONNECTED']);
                done();
            });
        });
    });
});
