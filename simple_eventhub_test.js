var AMQPClient  = require('./amqp_client');

var exceptions  = require('./lib/exceptions');

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

    var msgVal = Math.floor(Math.random() * 10000);

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;
    var sendAddr = eventHubName;
    var recvAddr = eventHubName + '/ConsumerGroups/$default/Partitions/';

    var client = new AMQPClient(AMQPClient.policies.EventHubPolicy);
    client.connect(uri, function() {
        client.send({ "DataString": "From Node", "DataValue": msgVal }, sendAddr, { 'x-opt-partition-key' : 'pk1' }, function() {
            for (var idx = 0; idx < numPartitions; ++idx) {
                var curIdx = idx;
                var curRcvAddr = recvAddr + curIdx;
                // We're being lazy and defining this callback inline to close over curIdx, jshint gets mad.
                // Since this is example code, I'm ok ignoring jshint in this case - it's easier to read than defining above and using bind.
                /* jshint ignore:start */
                var receiveHandler = function (err, payload, annotations) {
                    if (err) {
                        console.log('ERROR: ');
                        console.log(err);
                    } else {
                        console.log('Recv(' + curIdx + '): ');
                        console.log(payload);
                        if (annotations) {
                            console.log('Annotations:');
                            console.log(annotations);
                        }
                        console.log('');
                        if (payload.DataValue === msgVal) {
                            client.disconnect(function () {
                                console.log("Disconnected, when we saw the value we'd inserted.");
                            });
                        }
                    }
                };
                /* jshint ignore:end */

                if (filter) {
                    client.receive(curRcvAddr, filter, receiveHandler);
                } else {
                    client.receive(curRcvAddr, receiveHandler);
                }
            }
        });
    });
}
