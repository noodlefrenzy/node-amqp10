var AMQPClient  = require('../lib/amqp_client');

var exceptions  = require('../lib/exceptions');

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

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;
    var sendAddr = eventHubName;

    var offset = 1000000;
    var numMsgs = 10000;

    var msgSent = {};
    var msgSentCompleted = {};
    var msgErrs = [];

    var client = new AMQPClient(AMQPClient.policies.EventHubPolicy);
    client.connect(uri, function() {
        client.send({ 'DataString': 'Ignore', 'DataValue': 0 }, sendAddr, {'x-opt-partition-key': 'pk1' }, function () {
            var sendComplete = function (id, tx_err, state) {
                msgSentCompleted[id] = Date.now();
                if (tx_err) {
                    msgErrs.push({id: id, err: tx_err});
                }
            };
            for (var msgid = 0; msgid < numMsgs; ++msgid) {
                var curId = msgid + offset;
                msgSent[curId] = Date.now();
                client.send({
                    "DataString": "From Node",
                    "DataValue": curId
                }, sendAddr, {'x-opt-partition-key': 'pk' + curId}, sendComplete.bind(null, curId));
            }
            setInterval(function () {
                var timeToSend = 0;
                var totalCnt = 0;
                var sentBySec = {};
                var settledBySec = {};
                for (var key in msgSentCompleted) {
                    ++totalCnt;
                    timeToSend += (msgSentCompleted[key] - msgSent[key]);
                    var sec = Math.floor(msgSentCompleted[key] / 1000);
                    if (settledBySec[sec] === undefined) settledBySec[sec] = 0;
                    ++settledBySec[sec];
                    sec = Math.floor(msgSent[key] / 1000);
                    if (sentBySec[sec] === undefined) sentBySec[sec] = 0;
                    ++sentBySec[sec];
                }
                if (totalCnt > 0) {
                    var mtts = (timeToSend / totalCnt);
                    console.log('  Of ' + totalCnt + ' messages, Mean time-to-send: ' + mtts + ', msgs/sec: ' + (1000 / mtts));
                }
                var secs = Object.keys(settledBySec).sort();
                console.log('Messages settled, by second: ');
                var idx;
                for (idx = 0; idx < secs.length; ++idx) {
                    console.log('[' + secs[idx] + ']: ' + settledBySec[secs[idx]] + ' msgs');
                }
                secs = Object.keys(sentBySec).sort();
                console.log('Messages sent, by second: ');
                for (idx = 0; idx < secs.length; ++idx) {
                    console.log('[' + secs[idx] + ']: ' + sentBySec[secs[idx]] + ' msgs');
                }
                if (totalCnt === numMsgs) {
                    client.disconnect(function () {
                        console.log('Saw all messages sent.');
                        process.exit();
                    });
                }
            }, 30000);
        });
    });
}

