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
  argCheck(settings, ['serviceBusHost', 'SASKeyName', 'SASKey', 'queueName']);
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
  client.connect(uri).then(function () {
    client.createSender(queueName).then(function (sender) {
      sender.on('errorReceived', function(tx_err) {
        console.warn('===> TX ERROR: ', tx_err);
      });
      client.createReceiver(queueName).then(function (receiver) {
        receiver.on('message', function (message) {
          console.log('Recv: ');
          console.log(message.body);
          if (message.annotations) {
            console.log('Annotations:');
            console.log(message.annotations);
          }
          console.log('');
          if (message.body.DataValue === msgVal) {
            client.disconnect().then(function () {
              console.log("Disconnected, when we saw the value we'd inserted.");
              process.exit(0);
            });
          }
        });
        receiver.on('errorReceived', function(rx_err) {
          console.warn('===> RX ERROR: ', rx_err);
        });
        sender.send({"DataString": "From Node", "DataValue": msgVal}).then(function (state) {
          console.log('State: ', state);
        });
      });
    });
  }).catch(function (e) {
    console.warn('Error send/receive: ', e);
  });
}

