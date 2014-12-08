var debug       = require('debug')('amqp10-app'),
    builder     = require('buffer-builder'),

    constants   = require('./lib/constants'),
    exceptions  = require('./lib/exceptions'),
    u           = require('./lib/utilities'),

    AMQPError   = require('./lib/types/amqp_error'),
    Symbol      = require('./lib/types/symbol'),
    Source      = require('./lib/types/source_target').Source,
    Target      = require('./lib/types/source_target').Target,
    M           = require('./lib/types/message'),

    Connection  = require('./lib/connection'),
    Session     = require('./lib/session').Session,
    Link        = require('./lib/session').Link,
    Sasl        = require('./lib/sasl'),

    AMQPClient      = require('./amqp_client');

// @todo A lot of these should be replaced with default policy settings
// @todo amqp_client should be doing a lot of this work
function makeSession(sbHost, sasName, sasKey, sendAddr, recvAddr, cb) {
    var conn = new Connection({
        containerId: 'test',
        hostname: sbHost,
        idleTimeout: 120000,
        sslOptions: {
        }
    });
    conn.open({
        protocol: 'amqps',
        host: sbHost,
        port: 5671,
        user: sasName,
        pass: sasKey
    }, new Sasl());
    conn.on(Connection.Connected, function() {
        var session = new Session(conn);
        session.on(Session.Mapped, function(s) {
            cb(sendAddr, recvAddr, s);
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
    });
}

function makeSender(session, sendAddr, cb) {
    session.on(Session.LinkAttached, function(link) {
        debug('Sender Attached ' + link.name);
        cb(link);
    });
    session.attachLink({
        name: sendAddr,
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
}

function makeReceiver(session, recvAddr, cb) {
    session.on(Session.LinkAttached, function (link) {
        if (link.name === recvAddr) {
            debug('Receiver Attached ' + link.name);
            cb(link);
        }
    });
    session.attachLink({
        name: recvAddr,
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
}

var msgId = 1;
var doneSending = false;

function send(link) {
    var timer = setInterval(function() {
        if (link.linkCredit > 0) {
            var curId = msgId++;
            var msg = new M.Message();
            msg.body.push('test message ' + curId);
            link.session.sendMessage(link, msg, {deliveryTag: new Buffer([curId])});
        }
        if (msgId > 100) {
            clearInterval(timer);
            doneSending = true;
        }
    }, 1000);
}

function recv(link) {
    link.on(Link.MessageReceived, function(m) {
        console.log('Message on ' + link.name);
        console.log(m.annotations);
        console.log(m.body);
    });
    setInterval(function() {
        if (link.linkCredit < 5) {
            link.addCredits(10);
        }
    }, 1000);
}

function runSendRecv(sendAddr, recvAddr, session) {
    //makeSender(session, sendAddr, send);
    var makeRx = function(addr) {
        makeReceiver(session, addr, recv);
    };
    for (var idx=0; idx < 4; ++idx) {
        var curAddr = recvAddr + idx;
        setTimeout(makeRx, (idx + 1) * 1000, curAddr);
    }
    var tester = setInterval(function() {
        if (doneSending) {
            setTimeout(function() {
                session.connection.close();
            }, 1000);
        }
    }, 1000);
}

// From SAS endpoint entry for both send/receive permissions, e.g.:
// Endpoint=sb://<sb-host>/;SharedAccessKeyName=<name>;SharedAccessKey=<key>
// Settings file should be JSON containing:
// {
//   serviceBusHost: <sb-host>,
//   eventHubName: <eh-name>,
//   SASKeyName: <name>,
//   SASKey: <key>
// }

//makeSession(runSendRecv);

if (process.argv.length < 3) {
    console.warn('Usage: node '+process.argv[1]+' <settings json file>');
} else {
    var settingsFile = process.argv[2];
    var settings = require('./' + settingsFile);
    exceptions.assertArguments(settings, [ 'serviceBusHost', 'SASKeyName', 'SASKey', 'eventHubName']);
    var sbHost = settings.serviceBusHost + '.servicebus.windows.net';
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var sendAddr = settings.eventHubName;
    var recvAddr = settings.eventHubName + '/ConsumerGroups/' + (settings.consumerGroup || '$default') + '/Partitions/';
    console.log('Tx to '+sbHost+'/'+sendAddr+', Rx from '+sbHost+'/'+recvAddr);
    makeSession(sbHost, sasName, sasKey, sendAddr, recvAddr, runSendRecv);
}
