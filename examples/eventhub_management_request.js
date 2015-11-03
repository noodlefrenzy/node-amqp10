//================================
// EventHub Management test - takes in a JSON settings file
// containing settings for connecting to the Hub:
// - protocol: should never be set, defaults to amqps
// - SASKeyName: name of your SAS key which should allow send/receive
// - SASKey: actual SAS key value
// - serviceBusHost: name of the host without suffix (e.g. https://foobar-ns.servicebus.windows.net/foobar-hub => foobar-ns)
// - eventHubName: name of the hub (e.g. https://foobar-ns.servicebus.windows.net/foobar-hub => foobar-hub)
//
// Connects to the $management hub of the service bus, and sends a request to read properties for the given event hub
// Dumps out the number of partitions, their IDs, and then quits.
//================================

'use strict';
//var AMQPClient = require('amqp10').Client;
var AMQPClient  = require('../lib').Client,
  Policy = require('../lib').Policy,
  Promise = require('bluebird');

var settingsFile = process.argv[2];
var settings = {};
if (settingsFile) {
  settings = require('./' + settingsFile);
} else {
  settings = {
    serviceBusHost: process.env.ServiceBusNamespace,
    eventHubName: process.env.EventHubName,
    partitions: process.env.EventHubPartitionCount,
    SASKeyName: process.env.EventHubKeyName,
    SASKey: process.env.EventHubKey
  };
}

if (!settings.serviceBusHost || !settings.eventHubName || !settings.SASKeyName || !settings.SASKey || !settings.partitions) {
  console.warn('Must provide either settings json file or appropriate environment variables.');
  process.exit(1);
}

var protocol = settings.protocol || 'amqps';
var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
if (settings.serviceBusHost.indexOf(".") !== -1) {
  serviceBusHost = settings.serviceBusHost;
}
var sasName = settings.SASKeyName;
var sasKey = settings.SASKey;
var eventHubName = settings.eventHubName;

var uri = protocol + '://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;
var managementEndpoint = '$management';

var rxName = 'client-temp-node';
var rxOptions = { attach: { target: { address: rxName } } };
var client = new AMQPClient(Policy.EventHub);
client.connect(uri)
  .then(function () {
    return Promise.all([
      client.createReceiver(managementEndpoint, rxOptions),
      client.createSender(managementEndpoint)
    ]);
  })
  .spread(function (receiver, sender) {
    sender.on('errorReceived', function (tx_err) { console.warn('===> TX ERROR: ', tx_err); });
    receiver.on('errorReceived', function (rx_err) { console.warn('===> RX ERROR: ', rx_err); });
    receiver.on('message', function (msg) {
      console.log('Message received: ');
      console.log('Number of partitions: ' + msg.body.partition_count);
      console.log('Partition IDs: ' + msg.body.partition_ids);
      client.disconnect().then(function() {
        console.log('=== Disconnected ===');
        process.exit(0);
      });
    });

    var request = {
      body: 'stub',
      properties: { messageId: 'request1', replyTo: rxName },
      applicationProperties: { operation: 'READ', name: eventHubName, type: 'com.microsoft:eventhub' }
    };
    return sender.send(request).then(function (state) {
      // this can be used to optionally track the disposition of the sent message
      console.log('State: ', state);
    });
  })
  .error(function (e) {
    console.warn('connection error: ', e);
  });
