var AMQPClient  = require('./amqp_client'),
    exceptions  = require('./lib/exceptions');

function sendCB(err, msg) {
    if (err) {
        console.log('ERROR: ');
        console.log(err);
    } else {
        console.log('Sent: ' + msg);
    }
}

var msgVal = Math.floor(Math.random() * 10000);

// Partition is first because it's bound at the setter, not by the callback caller.
function recvCB(partition, err, payload, annotations) {
    if (err) {
        console.log('ERROR: ');
        console.log(err);
    } else {
        console.log('Recv(' + partition + '): ');
        console.log(payload);
        if (annotations) {
            console.log('Annotations:');
            console.log(annotations);
        }
        console.log('');
    }
}

var filterOffset = undefined; // 43350;

function sendRecv(settings, err, client) {
    var sendAddr = settings.eventHubName;
    var recvAddr = settings.eventHubName + '/ConsumerGroups/' + (settings.consumerGroup || '$default') + '/Partitions/';
    var numPartitions = settings.partitions;

    if (err) {
        console.log('ERROR: ');
        console.log(err);
    } else {
        var filter = undefined;
        if (filterOffset) {
            filter = AMQPClient.adapters.Translator(['map',
                ['symbol', 'apache.org:selector-filter:string'],
                ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', "amqp.annotation.x-opt-offset > '" + filterOffset + "'"]]
            ]);
        }

        client.send(JSON.stringify({ "DataString": "From Node", "DataValue": msgVal }), sendAddr, { 'x-opt-partition-key' : 'pk1' }, sendCB);
        for (var idx=0; idx < numPartitions; ++idx) {
            var curIdx = idx;
            var curRcvAddr = recvAddr + curIdx;
            if (filter) {
                client.receive(curRcvAddr, filter, recvCB.bind(null, curIdx));
            } else {
                client.receive(curRcvAddr, recvCB.bind(null, curIdx));
            }
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
