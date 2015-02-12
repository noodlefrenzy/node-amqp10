var AMQPClient  = require('./amqp_client');

var exceptions  = require('./lib/exceptions');

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
    var recvAddr = uri + '/' + eventHubName + '/ConsumerGroups/$default/Partitions/';

    var rcvsBySec = {};

    var client = new AMQPClient(AMQPClient.policies.EventHubPolicy);
    var receiveHandler = function (id, err, payload, annotations) {
        if (err) {
            console.log('ERROR: ');
            console.log(err);
        } else {
            var sec = Math.floor(Date.now() / 1000);
            if (rcvsBySec[sec] === undefined) rcvsBySec[sec] = 0;
            ++rcvsBySec[sec];
        }
    };

    setInterval(function() {
        var secs = Object.keys(rcvsBySec).sort();
        for (var idx in secs) {
            var sec = secs[idx];
            console.log("["+sec+"]: "+rcvsBySec[sec]+" messages.");
        }
    }, 30000);

    for (var idx = 0; idx < numPartitions; ++idx) {
        var curIdx = idx;
        var curRcvAddr = recvAddr + curIdx;

        client.receive(curRcvAddr, receiveHandler.bind(null, curIdx));
    }
}
