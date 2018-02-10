//================================
// Simple ServiceBus Topic SAS Token test - takes in a JSON settings file
// containing settings for connecting to the Topic:
// - protocol: should never be set, defaults to amqps
// - SASToken: The sas token generated to match your topic/subscription
// - serviceBusHost: name of the host without suffix (e.g. https://foobar-ns.servicebus.windows.net/foobart => foobar-ns)
// - topicName: name of the topic (e.g. https://foobar-ns.servicebus.windows.net/foobart => foobart)
// - subscriptionName: name of the subscription for the topic (e.g. https://foobar-ns.servicebus.windows.net/foobart/Subscriptions/foobars => foobars)
//
// Will set up a receiver, and log incoming messages. ending should be the same as other examples as long as your token allows.
// This example was created using a token scoped to the subscription level, some tweaking may be needed for topic level tokens.
//================================

'use strict';
//var AMQPClient = require('amqp10').Client;
var AMQPClient  = require('../lib').Client,
    Policy = require('../lib').Policy,
    DescribedType = require('../lib/types/described_type');

var settingsFile = process.argv[2];
var settings = {};
if (settingsFile) {
  settings = require('./' + settingsFile);
} else {
  settings = {
    serviceBusHost: process.env.ServiceBusNamespace,
    topicName: process.env.ServiceBusTopicName,
    subscriptionName: process.env.ServiceBusTopicSubscriptionName,
    SASToken: process.env.ServiceBusSASToken, //in reality this probably changes too often to be an env var.
  };
}
settings = {
  serviceBusHost: 'ffc1servicebus',
  topicName: 'ffc1_chat_qa',
  subscriptionName: 'towerlocal',
  SASToken: 'SharedAccessSignature sr=sb%3A%2F%2Fffc1servicebus.servicebus.windows.net%2Fffc1_chat_qa%2Fsubscriptions%2Ftowerlocal&sig=7GpagZoeWiClZnvpNAY1h%2FCGMtIYoR6pPQIOQZUkPC4%3D&se=1518340791&skn=RootManageSharedAccessKey'
};

if (!settings.serviceBusHost || !settings.topicName || !settings.subscriptionName || !settings.SASToken) {
  console.warn('Must provide either settings json file or appropriate environment variables.');
  process.exit(1);
}

var protocol = settings.protocol || 'amqps';
var serviceBusHost = settings.serviceBusHost + '.servicebus.windows.net';
if (settings.serviceBusHost.indexOf(".") !== -1) {
  serviceBusHost = settings.serviceBusHost;
}

var topicName = settings.topicName;
var subscriptionName = settings.subscriptionName;


var uri = protocol + '://' + serviceBusHost;
var client = new AMQPClient(Policy.ServiceBusTopic);

client.connect(uri)
  .then(function() {
    return client.createSender('$cbs');
  })
  .then(function(cbsSender) {
    var request = {
      body: new DescribedType(0x77, settings.SASToken),
      applicationProperties: {
        "operation": "put-token",
        "type": "servicebus.windows.net:sastoken",
        "name": 'amqp://' + serviceBusHost + '/' + topicName + '/subscriptions/' + subscriptionName
      }
    };
    console.log('Sending SAS Token');
    return cbsSender.send(request).then(function (state) {
      console.log('Token msg state: ', state); //to catch error replies, add a listener to $cbs and add properties:{'ReplyTo':'$cbs'} in the request.
    });
  })
  .then(function () {
    return client.createReceiver(topicName + '/subscriptions/' + subscriptionName)
  })
  .then(function(receiver) {
    // error handling
    receiver.on('errorReceived', function(rx_err) { console.warn('===> RX ERROR: ', rx_err); });

    // message event handler
    receiver.on('message', function(message) {
      console.log('received: ', message);
    });
  })
  .error(function (e) {
    console.warn('connection error: ', e);
  });
