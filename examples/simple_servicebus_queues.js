//================================
// Simple ServiceBus Queue test - takes in a JSON settings file
// containing settings for connecting to the Queue:
// - protocol: should never be set, defaults to amqps
// - SASKeyName: name of your SAS key which should allow send/receive
// - SASKey: actual SAS key value
// - serviceBusHost: name of the host without suffix (e.g. https://foobar-ns.servicebus.windows.net/foobarq => foobar-ns)
// - queueName: name of the queue (e.g. https://foobar-ns.servicebus.windows.net/foobarq => foobarq)
//
// By default, will set up a receiver, then send a message and exit when that message is received.
// Passing in a final argument of (send|receive) causes it to only execute one branch of that flow.
//================================

'use strict';
//var AMQPClient = require('amqp10').Client;
var AMQPClient  = require('../lib').Client,
    Policy = require('../lib').Policy;

var settingsFile = process.argv[2];
var settings = {};
if (settingsFile) {
  settings = require('./' + settingsFile);
} else {
  settings = {
    serviceBusHost: process.env.ServiceBusNamespace,
    queueName: process.env.ServiceBusQueueName,
    SASKeyName: process.env.ServiceBusQueueKeyName,
    SASKey: process.env.ServiceBusQueueKey
  };
}

if (!settings.serviceBusHost || !settings.queueName || !settings.SASKeyName || !settings.SASKey) {
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
var queueName = settings.queueName;

var msgVal = Math.floor(Math.random() * 1000000);

var uri = protocol + '://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;

var client = new AMQPClient(Policy.ServiceBusQueue);
client.connect(uri)
  .then(function () {
    return Promise.all([
      client.createSender(queueName),
      client.createReceiver(queueName)
    ]);
  })
  .spread(function(sender, receiver) {
    sender.on('errorReceived', function(tx_err) { console.warn('===> TX ERROR: ', tx_err); });
    receiver.on('errorReceived', function(rx_err) { console.warn('===> RX ERROR: ', rx_err); });
    receiver.on('message', function (message) {
      console.log('received: ', message.body);
      if (message.annotations) console.log('annotations: ', message.annotations);
      if (message.body.DataValue === msgVal) {
        client.disconnect().then(function () {
          console.log('disconnected, when we saw the value we inserted.');
          process.exit(0);
        });
      }
    });

    return sender.send({ DataString: 'From Node', DataValue: msgVal }).then(function (state) {
      // this can be used to optionally track the disposition of the sent message
      console.log('state: ', state);
    });
  })
  .error(function (e) {
    console.warn('connection error: ', e);
  });
