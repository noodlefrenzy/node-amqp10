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
  var numPartitions = settings.partitions;

  var uri = protocol + '://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;
  var sendAddr = eventHubName;
  var recvAddr = eventHubName + '/ConsumerGroups/$default/Partitions/';

  var msgVal = 0;
  var client = new AMQPClient(AMQPClient.policies.EventHubPolicy);
  client.connect(uri, function() {
    client.send({ "DataString": "From Node", "DataValue": msgVal }, sendAddr, { 'x-opt-partition-key' : 'pk'+msgVal }, function() {});
    setInterval(function () {
      msgVal++;
      client.send({ "DataString": "From Node", "DataValue": msgVal }, sendAddr, { 'x-opt-partition-key' : 'pk'+msgVal }, function() {});
    }, 1000);
  });
}

