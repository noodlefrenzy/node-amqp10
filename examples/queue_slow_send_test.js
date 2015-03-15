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
    exceptions.assertArguments(settings, [ 'serviceBusHost', 'SASKeyName', 'SASKey', 'queueName']);
    var protocol = settings.protocol || 'amqps';
    var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
    if (settings.serviceBusHost.indexOf(".") !== -1) {
        serviceBusHost = settings.serviceBusHost;
    }
    var sasName = settings.SASKeyName;
    var sasKey = settings.SASKey;
    var queueName = settings.queueName;

    var msgVal = Math.floor(Math.random() * 10000);

    var uri = 'amqps://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost + '/' + queueName;

    var msgVal = 0;
    var secs = 0;
    var secsUntilSend = 640;

    var client = new AMQPClient(AMQPClient.policies.ServiceBusQueuePolicy);
    client.send({ "DataString": "From Node", "DataValue": msgVal }, uri, function() {});
    msgVal++;
    setInterval(function () {
        ++secs;
        if (secsUntilSend === secs) {
            console.log('Sending at interval ' + secsUntilSend);
            secsUntilSend *= 2;
            secs = 0;
            client.send({ "DataString": "From Node", "DataValue": msgVal }, uri, function() {});
            msgVal++;
        }
    }, 1000);
}


