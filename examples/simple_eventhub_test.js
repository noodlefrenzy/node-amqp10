var AMQPClient  = require('../lib/amqp_client');

var filterOffset; // example filter offset value might be: 43350;
var filter;
if (filterOffset) {
    filter = {
        'apache.org:selector-filter:string': AMQPClient.adapters.Translator(
            ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', "amqp.annotation.x-opt-offset > '" + filterOffset + "'"]])
    };
}

function argCheck(settings, options) {
    var missing = [];
    for (var idx in options) {
        if (settings[options[idx]] === undefined) missing.push(options[idx]);
    }
    if (missing.length > 0) {
        throw new Error('Required settings ' + (missing.join(', ')) + ' missing.');
    }
}

if (process.argv.length < 3) {
    console.warn('Usage: node '+process.argv[1]+' <settings json file>');
} else {
    var settingsFile = process.argv[2];
    var settings = require('./' + settingsFile);
    argCheck(settings, [ 'serviceBusHost', 'SASKeyName', 'SASKey', 'eventHubName', 'partitions' ]);
    var protocol = settings.protocol || 'amqps';
    var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var eventHubName = settings.eventHubName;
    var numPartitions = settings.partitions;

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;
    var sendAddr = eventHubName;
    var recvAddr = eventHubName + '/ConsumerGroups/$default/Partitions/';

    var msgVal = Math.floor(Math.random() * 1000000);

    var sender = true;
    var receiver = true;
    if (process.argv.length > 3) {
        if (process.argv[3] === 'send') receiver = false;
        else if (process.argv[3] === 'receive') sender = false;
        else throw new Error('Unknown action.');
    }

    var receiveCB = function (myIdx, err, payload, annotations) {
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
            if (sender) {
                // If not a sender, no use checking for value.
                if (payload.DataValue === msgVal) {
                    client.disconnect(function () {
                        console.log("Disconnected, when we saw the value we'd inserted.");
                        process.exit(0);
                    });
                }
            }
        }
    };

    var sendCB = function(tx_err, state) {
        if (tx_err) {
            console.log('Error Sending: ');
            console.log(tx_err);
        } else {
            if (receiver) {
                for (var idx = 0; idx < numPartitions; ++idx) {
                    var curIdx = idx;
                    var curRcvAddr = recvAddr + curIdx;
                    client.receive(curRcvAddr, filter, receiveCB.bind(null, curIdx));
                }
            } else {
                console.log('Send message with value ' + msgVal + '.  Not receiving, so exiting');
                process.exit(0);
            }
        }
    };

    var client = new AMQPClient(AMQPClient.policies.EventHubPolicy);
    client.connect(uri, function() {
        if (sender) {
            client.send({
                "DataString": "From Node",
                "DataValue": msgVal
            }, sendAddr, {'x-opt-partition-key': 'pk' + msgVal}, sendCB);
        } else if (receiver) {
            for (var idx = 0; idx < numPartitions; ++idx) {
                var curIdx = idx;
                var curRcvAddr = recvAddr + curIdx;
                client.receive(curRcvAddr, undefined, receiveCB.bind(null, curIdx));
            }
        }
    });
}
