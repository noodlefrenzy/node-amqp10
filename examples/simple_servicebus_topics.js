//================================
// Simple ServiceBus Topic test - takes in a JSON settings file
// containing settings for connecting to the Topic:
// - protocol: should never be set, defaults to amqps
// - SASKeyName: name of your SAS key which should allow send/receive
// - SASKey: actual SAS key value
// - serviceBusHost: name of the host without suffix (e.g. https://foobar-ns.servicebus.windows.net/foobart => foobar-ns)
// - topicName: name of the topic (e.g. https://foobar-ns.servicebus.windows.net/foobart => foobart)
// - subscriptionName: name of the subscription for the topic (e.g. https://foobar-ns.servicebus.windows.net/foobart/Subscriptions/foobars => foobars)
//
// Will set up a receiver, then send a message and exit when that message is received.
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

var msgVal = Math.floor(Math.random() * 10000);

if (process.argv.length < 3) {
    console.warn('Usage: node '+process.argv[1]+' <settings json file>');
} else {
  var settingsFile = process.argv[2];
  var settings = require('./' + settingsFile);
  argCheck(settings, ['serviceBusHost', 'SASKeyName', 'SASKey', 'topicName', 'subscriptionName']);
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

  var uri = protocol + '://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;

  var client = new AMQPClient(Policy.ServiceBusTopic);
  client.connect(uri).then(function () {
    client.send({"DataString": "From Node", "DataValue": msgVal}, topicName).then(function (state) {
      client.createReceiver(topicName + '/Subscriptions/' + subscriptionName, function (rx_err, message) {
        if (rx_err) {
          console.log('Error Receiving: ');
          console.log(rx_err);
        } else {
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
            });
          }
        }
      });
    });
  });
}


