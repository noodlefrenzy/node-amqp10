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
//var AMQPClient = require('amqp10').Client;
var AMQPClient  = require('../lib').Client,
    Policy = require('../lib').Policy;

// Set the offset for the EventHub - this is where it should start receiving from, and is typically different for each partition
// Here, I'm setting a global offset, just to show you how it's done. See node-sbus-amqp10 for a wrapper library that will
// take care of this for you.
var filterOffset; // example filter offset value might be: 43350;
var filterOption; // todo:: need a x-opt-offset per partition.
if (filterOffset) {
  filterOption = {
    attach: { source: { filter: {
      'apache.org:selector-filter:string': AMQPClient.adapters.Translator(
        ['described', ['symbol', 'apache.org:selector-filter:string'], ['string', "amqp.annotation.x-opt-offset > '" + filterOffset + "'"]])
    } } }
  };
}

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
} else {
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
  var sendAddr = eventHubName;
  var recvAddr = eventHubName + '/ConsumerGroups/$default/Partitions/';

  var msgVal = Math.floor(Math.random() * 1000000);

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
    if (msg.body.DataValue === msgVal) {
      client.disconnect().then(function () {
        console.log("Disconnected, when we saw the value we'd inserted.");
        process.exit(0);
      });
    }
  };
  
  var setupReceiver = function(curIdx, curRcvAddr, filterOption) {
    client.createReceiver(curRcvAddr, filterOption)
      .then(function (receiver) {
        receiver.on('message', messageHandler.bind(null, curIdx));
        receiver.on('errorReceived', errorHandler.bind(null, curIdx));
      })
  }
  var client = new AMQPClient(Policy.EventHub);
  client.connect(uri).then(function () {
    for (var idx = 0; idx < numPartitions; ++idx) {
      setupReceiver(idx, recvAddr + idx, filterOption) // TODO:: filterOption-> checkpoints are per partition.
    }
    // {'x-opt-partition-key': 'pk' + msgVal}
    client.createSender(sendAddr).then(function (sender) {
      sender.on('errorReceived', function (tx_err) {
        console.warn('===> TX ERROR: ', tx_err);
      });
      sender.send({ "DataString": "From Node", "DataValue": msgVal }, { annotations: {'x-opt-partition-key': 'pk' + msgVal} }).then(function (state) {
        console.log('State: ', state);
      });
    });
  }).catch(function (e) {
    console.warn('Failed to send due to ', e);
  });
}
