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

// Simple argument-checker, you can ignore.
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
  console.warn('Usage: node ' + process.argv[1] + ' <settings json file>');
  process.exit(1);
}

var settingsFile = process.argv[2];
var settings = require('./' + settingsFile);
argCheck(settings, ['serviceBusHost', 'SASKeyName', 'SASKey', 'eventHubName', 'partitions']);
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
var managementEndpoint = '$management';

var errorHandler = function(myIdx, rx_err) {
  console.warn('==> RX ERROR: ', rx_err);
};

var messageHandler = function (myIdx, msg) {
  console.log('Recv(' + myIdx + '): ');
  console.log(msg.body);
  if (msg.annotations) {
    console.log('Annotations:');
    console.log(msg.annotations);
  }
  console.log('');
};

var rxName = 'client-temp-node';
var rxOptions = { attach: { target: { address: rxName } } };
var client = new AMQPClient(Policy.EventHub);
client.connect(uri).then(function () {
  return Promise.all([
    client.createReceiver(managementEndpoint, rxOptions),
    client.createSender(managementEndpoint)
  ]);
})
.spread(function (receiver, sender) {
  receiver.on('errorReceived', function (rx_err) {
    console.warn('===> RX ERROR: ', rx_err);
  });
  receiver.on('message', function (msg) {
    console.log('Message received: ');
    console.log('Number of partitions: ' + msg.body.partition_count);
    console.log('Partition IDs: ' + msg.body.partition_ids);
    client.disconnect().then(function() {
      console.log('=== Disconnected ===');
      process.exit(0);
    })
  });
  sender.on('errorReceived', function (tx_err) {
    console.warn('===> TX ERROR: ', tx_err);
  });
  var request = { body: "stub", properties: { messageId: 'request1', replyTo: rxName }, applicationProperties: { operation: "READ", name: eventHubName, type: "com.microsoft:eventhub" } };
  sender.send(request).then(function (state) {
    console.log('State: ', state);
  });
})
.catch(function (e) {
  console.warn('Failed to send due to ', e);
});
