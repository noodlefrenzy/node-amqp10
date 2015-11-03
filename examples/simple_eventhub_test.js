//================================
// Simple EventHub test - takes in a JSON settings file
// containing settings for connecting to the Hub:
// - protocol: should never be set, defaults to amqps
// - SASKeyName: name of your SAS key which should allow send/receive
// - SASKey: actual SAS key value
// - serviceBusHost: name of the host without suffix (e.g. https://foobar-ns.servicebus.windows.net/foobar-hub => foobar-ns)
// - eventHubName: name of the hub (e.g. https://foobar-ns.servicebus.windows.net/foobar-hub => foobar-hub)
// - partitions: number of partitions (see node-sbus-amqp10 for a wrapper client that will figure this out for you and connect appropriately)
//
// By default, will set up a receiver on each partition, then send a message and exit when that message is received.
// Passing in a final argument of (send|receive) causes it to only execute one branch of that flow.
//================================

'use strict';
var Promise = require('bluebird'),
    AMQPClient  = require('../lib').Client,
    Policy = require('../lib').Policy,
    translator = require('../lib').translator;

// Set the offset for the EventHub - this is where it should start receiving from, and is typically different for each partition
// Here, I'm setting a global offset, just to show you how it's done. See node-sbus-amqp10 for a wrapper library that will
// take care of this for you.
var filterOffset; // example filter offset value might be: 43350;
var filterOption; // todo:: need a x-opt-offset per partition.
if (filterOffset) {
  filterOption = {
    attach: { source: { filter: {
      'apache.org:selector-filter:string': translator(
        ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', "amqp.annotation.x-opt-offset > '" + filterOffset + "'"]])
    } } }
  };
}

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
var numPartitions = settings.partitions;

var uri = protocol + '://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;
var sendAddr = eventHubName;
var recvAddr = eventHubName + '/ConsumerGroups/$default/Partitions/';

var msgVal = Math.floor(Math.random() * 1000000);

var client = new AMQPClient(Policy.EventHub);
var errorHandler = function(myIdx, rx_err) { console.warn('==> RX ERROR: ', rx_err); };
var messageHandler = function (myIdx, msg) {
  console.log('received(' + myIdx + '): ', msg.body);
  if (msg.annotations) console.log('annotations: ', msg.annotations);
  if (msg.body.DataValue === msgVal) {
    client.disconnect().then(function () {
      console.log('disconnected, when we saw the value we inserted.');
      process.exit(0);
    });
  }
};

function range(begin, end) {
  return Array.apply(null, new Array(end - begin)).map(function(_, i) { return i + begin; });
}

var createPartitionReceiver = function(curIdx, curRcvAddr, filterOption) {
  return client.createReceiver(curRcvAddr, filterOption)
    .then(function (receiver) {
      receiver.on('message', messageHandler.bind(null, curIdx));
      receiver.on('errorReceived', errorHandler.bind(null, curIdx));
    });
};

client.connect(uri)
  .then(function () {
    return Promise.all([
      client.createSender(sendAddr),

      // TODO:: filterOption-> checkpoints are per partition.
      Promise.map(range(0, numPartitions), function(idx) {
        return createPartitionReceiver(idx, recvAddr + idx, filterOption);
      })
    ]);
  })
  .spread(function(sender, unused) {
    sender.on('errorReceived', function (tx_err) { console.warn('===> TX ERROR: ', tx_err); });

    // {'x-opt-partition-key': 'pk' + msgVal}
    var message = { DataString: 'From Node', DataValue: msgVal };
    var options = { annotations: { 'x-opt-partition-key': 'pk' + msgVal } };
    return sender.send(message, options).then(function (state) {
      // this can be used to optionally track the disposition of the sent message
      console.log('state: ', state);
    });
  })
  .error(function (e) {
    console.warn('connection error: ', e);
  });

