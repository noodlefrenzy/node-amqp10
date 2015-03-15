var AMQPClient  = require('../lib/amqp_client');

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
    argCheck(settings, [ 'serviceBusHost', 'SASKeyName', 'SASKey', 'queueName']);
    var protocol = settings.protocol || 'amqps';
    var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var queueName = settings.queueName;

    var msgVal = Math.floor(Math.random() * 1000000);

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost + '/' + queueName;

    var sender = true;
    var receiver = true;
    if (process.argv.length > 3) {
        if (process.argv[3] === 'send') receiver = false;
        else if (process.argv[3] === 'receive') sender = false;
        else throw new Error('Unknown action.');
    }

    var receiveCB = function (rx_err, payload, annotations) {
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
            if (sender) {
                // If we aren't a sender, no value to look for.
                if (payload.DataValue === msgVal) {
                    client.disconnect(function () {
                        console.log("Disconnected, when we saw the value we'd inserted.");
                        process.exit(0);
                    });
                }
            }
        }
    };

    var sendCB = function (tx_err, state) {
        if (tx_err) {
            console.log('Error Sending: ');
            console.log(tx_err);
        } else {
            console.log('State: ', state);
            if (receiver) {
                client.receive(uri, receiveCB);
            } else {
                console.log('Sent message with value ' + msgVal + '.  Not receiving, so exiting');
                process.exit(0);
            }
        }
    };

    var client = new AMQPClient(AMQPClient.policies.ServiceBusQueuePolicy);
    if (sender) {
        client.send({"DataString": "From Node", "DataValue": msgVal}, uri, sendCB);
    } else if (receiver) {
        client.receive(uri, receiveCB);
    }
}

