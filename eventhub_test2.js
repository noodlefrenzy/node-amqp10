var AMQPClient  = require('./amqp_client'),
    exceptions  = require('./lib/exceptions');

function sendCB(msg, err) {
    if (err) {
        console.log('ERROR: ');
        console.log(err);
    } else {
        console.log('Sent: ' + msg);
    }
}

function recvCB(partition, payload, err) {
    if (err) {
        console.log('ERROR: ');
        console.log(err);
    } else {
        console.log('Recv(' + partition + '): ');
        console.log(payload);
        console.log('');
    }
}

function sendRecv(settings, client, err) {
    var sendAddr = settings.eventHubName;
    var recvAddr = settings.eventHubName + '/ConsumerGroups/' + (settings.consumerGroup || '$default') + '/Partitions/';
    var numPartitions = settings.partitions;

    if (err) {
        console.log('ERROR: ');
        console.log(err);
    } else {
        client.send('Testing 1.2.3...', sendAddr, sendCB);
        for (var idx=0; idx < numPartitions; ++idx) {
            var curIdx = idx;
            var curRcvAddr = recvAddr + curIdx;
            client.receive(curRcvAddr, recvCB.bind(null, curIdx));
        }
    }
}

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
    var uri = protocol + '://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + sbHost;
    var client = new AMQPClient(AMQPClient.policies.EventHubPolicy);
    client.connect(uri, sendRecv.bind(null, settings));
}
