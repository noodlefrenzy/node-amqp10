var debug       = require('debug')('amqp10-throughput'),
    builder     = require('buffer-builder'),
    fs          = require('fs'),

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
function makeSessions(protocol, port, sbHost, sasName, sasKey, sendAddr, cb) {
    var conn = new Connection({
        containerId: 'test',
        hostname: sbHost,
        idleTimeout: 120000,
        sslOptions: {
        }
    });
    conn.open({
        protocol: protocol,
        host: sbHost,
        port: port,
        user: sasName,
        pass: sasKey
    }, new Sasl());
    conn.on(Connection.Connected, function() {
        console.log('Connected');
        var session, boundCB;
        boundCB = cb.bind(null, sendAddr);
        session = new Session(conn);
        session.on(Session.Mapped, boundCB);
        session.on(Session.ErrorReceived, function(err) { console.log('ERROR'); console.log(err); });
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
        console.log('Sender Attached ' + link.name);
        cb(link);
    });
    session.attachLink({ options: {
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
    } });
}

var prevId = 0;
var msgId = 1;
var doneSending = false;
var numMessages = 10000;
var startTime, endTime;

var counts = [];
function send(link) {
    startTime = new Date();
    setInterval(function() {
        // === => done sending
        if (msgId !== prevId) {
            counts.push(msgId - prevId);
            prevId = msgId;
        }
    }, 1000);
    var sendFn = function() {
        if (!doneSending && link.canSend()) {
            while (link.canSend()) {
                var curId = msgId++;
                var msg = new M.Message();
                var payload = {Name: "From Node.js", Count: curId, Value: 4.56};
                var b = new builder();
                b.appendString(JSON.stringify(payload));
                msg.body.push(b.get());
                link.session.sendMessage(link, msg, {deliveryTag: new Buffer([curId])});
            }
        } else {
            console.log("Can't send");
        }
        if (msgId > numMessages) {
            doneSending = true;
            endTime = new Date();
        }
    };
    link.on(Link.CreditChange, function() {
        debug('Credit changed');
        sendFn();
    });
    sendFn();
}

function runSend(sendAddr, session) {
    console.log('Tx to '+sendAddr);
    makeSender(session, sendAddr, send);
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
    var protocol = settings.protocol || 'amqps';
    var port = settings.port || (protocol === 'amqps' ? 5671 : 5672);
    var sbHost = settings.serviceBusHost + '.servicebus.windows.net';
    if (settings.serviceBusHost.indexOf(".") !== -1) {
        sbHost = settings.serviceBusHost;
    }
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var sendAddr = settings.eventHubName;
    makeSessions(protocol, port, sbHost, sasName, sasKey, sendAddr, runSend);
    setInterval(function() {
        if (doneSending) {
            var avg = 0;
            fs.writeFileSync('throughput.txt', '');
            for (var idx = 0; idx < counts.length; ++idx) {
                fs.appendFileSync('throughput.txt', (idx+1) + ": " + counts[idx] + "\n");
                avg += counts[idx];
            }
            avg /= counts.length;
            fs.appendFileSync('throughput.txt', "Avg: " + avg + "\n");
            var elapsedMS = (endTime.getTime()-startTime.getTime());
            console.log('Sent '+numMessages+' in '+elapsedMS+' ms (~' + (elapsedMS/numMessages) + 'ms/message, ~'+(1000/(elapsedMS/numMessages))+' messages/sec');
            process.exit(0);
        }
    }, 5000);
}
