var AMQPClient  = require('../lib/amqp_client');

var exceptions  = require('../lib/exceptions');

var msgVal = Math.floor(Math.random() * 10000);

var filterOffset; // example filter offset value might be: 43350;
var filter;
if (filterOffset) {
    filter = {
        'apache.org:selector-filter:string': AMQPClient.adapters.Translator(
            ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', "amqp.annotation.x-opt-offset > '" + filterOffset + "'"]])
    };
}

if (process.argv.length < 3) {
    console.warn('Usage: node '+process.argv[1]+' <settings json file>');
} else {
    var settingsFile = process.argv[2];
    var settings = require('./' + settingsFile);
    exceptions.assertArguments(settings, [ 'serviceBusHost', 'SASKeyName', 'SASKey', 'eventHubName', 'partitions' ]);
    var protocol = settings.protocol || 'amqps';
    var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
    if (settings.serviceBusHost.indexOf(".") !== -1) {
        serviceBusHost = settings.serviceBusHost;
    }
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var eventHubName = settings.eventHubName;
    var numPartitions = settings.partitions;

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;
    var sendAddr = eventHubName;
    var recvAddr = eventHubName + '/ConsumerGroups/$default/Partitions/';

    var msg = 0;
    var offset = 1000;
    var numMsgs = 10000;

    var msgsByP = {};
    var lastCount = Date.now();
    var totalMessages = 0;
    var msgSent = {};
    var msgSentCompleted = {};
    var msgRcvd = {};

    var client = new AMQPClient(AMQPClient.policies.EventHubPolicy);
    client.connect(uri, function() {
        var receiveHandler = function (myIdx, err, payload, annotations) {
            if (err) {
                console.log('ERROR: ');
                console.log(err);
            } else {
                console.log('Recv(' + myIdx + '): ');
                console.log(payload);
                if (annotations) {
                    console.log('Annotations:');
                    console.log(annotations);
                }
                console.log('');
                msgsByP[myIdx].push({ time: Date.now(), num: payload.DataValue });
                if (msgSent[payload.DataValue]) {
                    msgRcvd[payload.DataValue] = Date.now();
                }
            }
        };
        for (var idx = 0; idx < numPartitions; ++idx) {
            var curIdx = idx;
            msgsByP[curIdx] = [];
            var curRcvAddr = recvAddr + curIdx;
            client.receive(curRcvAddr, receiveHandler.bind(null, curIdx));
        }
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
                }, sendAddr, {'x-opt-partition-key': 'pk' + curVal}, function () {
                    msgSentCompleted[curVal] = Date.now();
                });
            }
        }, 500);
        setInterval(function() {
            var nextCount = Date.now();
            var totalNewMessages = 0;
            for (var idx = 0; idx < numPartitions; ++idx) {
                var newMsgs = [];
                for (var idx2 = 0; idx2 < msgsByP[idx].length; ++idx2) {
                    if (msgsByP[idx][idx2].time >= lastCount && msgsByP[idx][idx2].time < nextCount) {
                        newMsgs.push(msgsByP[idx][idx2].num);
                    }
                }
                if (newMsgs.length > 0) {
                    console.log('  Partition ' + idx + ' saw ' + newMsgs.length + ' new messages: ' + newMsgs.join(', '));
                } else {
                    console.log('  Partition ' + idx + ' saw no new messages.');
                }
                totalNewMessages += newMsgs.length;
            }
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
