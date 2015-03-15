var AMQPClient  = require('../lib/amqp_client');

var exceptions  = require('../lib/exceptions');

if (process.argv.length < 3) {
    console.warn('Usage: node '+process.argv[1]+' <settings json file>');
} else {
    var settingsFile = process.argv[2];
    var settings = require('./' + settingsFile);
    exceptions.assertArguments(settings, [ 'serviceBusHost', 'SASKeyName', 'SASKey', 'queueName']);
    var protocol = settings.protocol || 'amqps';
    var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
    if (settings.serviceBusHost.indexOf(".") !== -1) {
        serviceBusHost = settings.serviceBusHost;
    }
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var queueName = settings.queueName;

    var msgVal = Math.floor(Math.random() * 10000);

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;

    var msg = 0;
    var offset = 100;
    var numMsgs = 10000;

    var msgsTS = [];
    var lastCount = Date.now();
    var totalMessages = 0;
    var msgSent = {};
    var msgSentCompleted = {};
    var msgRcvd = {};

    var client = new AMQPClient(AMQPClient.policies.ServiceBusQueuePolicy);
    client.connect(uri, function() {
        var receiveHandler = function (err, payload, annotations) {
            if (err) {
                console.log('ERROR: ');
                console.log(err);
            } else {
                console.log('Recv: ');
                console.log(payload);
                if (annotations) {
                    console.log('Annotations:');
                    console.log(annotations);
                }
                console.log('');
                msgsTS.push({ time: Date.now(), num: payload.DataValue });
                if (msgSent[payload.DataValue]) {
                    msgRcvd[payload.DataValue] = Date.now();
                }
            }
        };
        client.receive(queueName, receiveHandler);
        var intervalId = setInterval(function() {
            msgVal = ++msg;
            if (msgVal > numMsgs) {
                clearInterval(intervalId);
            } else {
                var curVal = msgVal + offset;
                msgSent[curVal] = Date.now();
                client.send({
                    "DataString": "From Node",
                    "DataValue": curVal
                }, queueName, function () {
                    msgSentCompleted[curVal] = Date.now();
                });
            }
        }, 500);
        setInterval(function() {
            var nextCount = Date.now();
            var totalNewMessages = 0;
            var newMsgs = [];
            for (var idx2 = 0; idx2 < msgsTS.length; ++idx2) {
                if (msgsTS[idx2].time >= lastCount && msgsTS[idx2].time < nextCount) {
                    newMsgs.push(msgsTS[idx2].num);
                }
            }
            if (newMsgs.length > 0) {
                console.log('  Queue saw ' + newMsgs.length + ' new messages: ' + newMsgs.join(', '));
            } else {
                console.log('  Queue saw no new messages.');
            }
            totalNewMessages += newMsgs.length;
            lastCount = nextCount;
            totalMessages += totalNewMessages;
            console.log('  ' + totalNewMessages + ' new messages (of a total of ' + totalMessages + ') seen this period.');
            var timeToSend = 0;
            var timeToRcv = 0;
            var totalCnt = 0;
            for (var key in msgRcvd) {
                ++totalCnt;
                timeToSend += msgSentCompleted[key] - msgSent[key];
                timeToRcv += msgRcvd[key] - msgSentCompleted[key];
            }
            if (totalCnt > 0) {
                console.log('  Of ' + totalCnt + ' messages, Mean time-to-send: ' + (timeToSend / totalCnt) + ', time-to-receive: ' + (timeToRcv / totalCnt));
            }
            if (totalCnt === numMsgs) {
                client.disconnect(function () { console.log('Saw all messages sent.'); process.exit(); });
            }
        }, 30000);
    });
}

