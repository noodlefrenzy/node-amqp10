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

//var AMQPClient = require('amqp10').Client;
var AMQPClient  = require('../lib').Client;

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

  var sender = true;
  var receiver = true;
  if (process.argv.length > 3) {
    if (process.argv[3] === 'send') receiver = false;
    else if (process.argv[3] === 'receive') sender = false;
    else throw new Error('Unknown action.');
  }

  var receiveCB = function (rx_err, message) {
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
      if (sender) {
        // If we aren't a sender, no value to look for.
        if (message.body.DataValue === msgVal) {
          client.disconnect().then(function () {
            console.log("Disconnected, when we saw the value we'd inserted.");
            process.exit(0);
          });
        }
      }
    }
  };

  var client = new AMQPClient(AMQPClient.policies.ServiceBusQueuePolicy);
  client.connect(uri).then(function () {
    if (sender) {
      client.send({"DataString": "From Node", "DataValue": msgVal}, queueName).then(function (state) {
        console.log('State: ', state);
        if (receiver) {
          client.createReceiver(queueName, receiveCB);
        } else {
          console.log('Sent message with value ' + msgVal + '.  Not receiving, so exiting');
          process.exit(0);
        }
      });
    } else {
      client.createReceiver(queueName, receiveCB);
    }
  }).catch(function (e) {
    console.warn('Error send/receive: ', e);
  });
}

