
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
  process.exit(1);
}

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

var uri = protocol + '://' + encodeURIComponent(sasName) + ':' + encodeURIComponent(sasKey) + '@' + serviceBusHost;

var msgVal = 1;
var delayBetweenSending = 1000 * 60;
var iteration = 0;
var numIters = 16;
var client = new AMQPClient(Policy.ServiceBusQueue);
client.connect(uri).then(function () {
  client.on('client:errorReceived', function (err) {
    console.warn('===> CLIENT ERROR: ', err);
  });
  client.on('connection:closed', function() {
    console.warn('===> CONNECTION CLOSED');
  });
  return client.createSender(queueName);
}).then(function (sender) {
  sender.on('errorReceived', function(tx_err) {
    console.warn('===> TX ERROR: ', tx_err);
  });
  sender.on('detached', function() {
    console.warn('===> TX DETACHED');
  });
  sender.session.on('unmapped', function() {
    console.warn('===> SESSION UNMAPPED');
  });
  sender.session.on('errorReceived', function(err) {
    console.warn('===> SESSION ERROR: ', err);
  });
  setInterval(function () {
    iteration++;
    if (iteration === numIters) {
      numIters /= 2;
      iteration = 0;
      console.log('===> SENDING message ' + msgVal + ', ' + numIters + ' mins to next send. Link state: ' + sender.state());
      sender.send({"DataString": "From Node", "DataValue": msgVal++}).then(function (state) {
        console.log('State: ', state);
      }).catch(function (eSend) {
        console.warn('===> TX SEND FAILURE: ', eSend);
      });
    } else {
      console.log('===> ' + (numIters - iteration) + ' minutes until sending. Link state: ' + sender.state());
    }
  }, delayBetweenSending);
}).catch(function (e) {
  console.warn('===> CONNECT ERROR: ', e);
});

