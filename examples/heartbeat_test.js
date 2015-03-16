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

    var sendTest = true;

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost + '/' + queueName;

    var client = new AMQPClient(AMQPClient.policies.ServiceBusQueuePolicy);
    client.connect(uri, function(conn_err) {
        if (conn_err) {
            console.log('Error Connecting: ');
            console.log(conn_err);
        } else {
            if (sendTest) {
                client.send({"DataString": "Heartbeat Test", "DataValue": 4444}, function (tx_err) {
                    if (tx_err) {
                        console.log('Error Sending: ');
                        console.log(tx_err);
                    } else {
                        console.log('Sent message...');
                    }
                });
            } else {
                client.receive(function (rx_err, payload, annotations) {
                    if (rx_err) {
                        console.log('ERROR: ');
                        console.log(rx_err);
                    } else {
                        console.log('Recv: ');
                        console.log(payload);
                        if (annotations) {
                            console.log('Annotations:');
                            console.log(annotations);
                        }
                        console.log('');
                    }
                });
            }
        }
    });
}

