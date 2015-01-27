var AMQPClient  = require('./amqp_client');

var exceptions  = require('./lib/exceptions');

var msgVal = Math.floor(Math.random() * 10000);

if (process.argv.length < 3) {
    console.warn('Usage: node '+process.argv[1]+' <settings json file>');
} else {
    var settingsFile = process.argv[2];
    var settings = require('./' + settingsFile);
    exceptions.assertArguments(settings, [ 'serviceBusHost', 'SASKeyName', 'SASKey', 'topicName', 'subscriptionName']);
    var protocol = settings.protocol || 'amqps';
    var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
    if (settings.serviceBusHost.indexOf(".") !== -1) {
        serviceBusHost = settings.serviceBusHost;
    }
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var topicName = settings.topicName;
    var subscriptionName = settings.subscriptionName;

    var msgVal = Math.floor(Math.random() * 10000);

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;

    var client = new AMQPClient(AMQPClient.policies.ServiceBusTopicPolicy);
    client.connect(uri, function(conn_err) {
        if (conn_err) {
            console.log('Error connecting: ');
            console.log(conn_err);
        } else {
            client.send({"DataString": "From Node", "DataValue": msgVal}, topicName, function (tx_err) {
                if (tx_err) {
                    console.log('Error Sending: ');
                    console.log(tx_err);
                } else {
                    client.receive(topicName + '/Subscriptions/' + subscriptionName, function (rx_err, payload, annotations) {
                        if (rx_err) {
                            console.log('Error Receiving: ');
                            console.log(rx_err);
                        } else {
                            console.log('Recv: ');
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
                    });
                }
            });
        }
    });
}


