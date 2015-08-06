///
/// A simple example showing ServiceBus' disconnect behavior:
/// - It seems to drop unused send links at around 10 minutes, despite heartbeat frames.
/// - It then drops the connection entirely at around 20 minutes.
///
/// The Link has logic to deal with re-attaching for this detach at 10 minutes, and
///  the connection has logic to deal with re-connecting and re-establishing links.
///
/// The code below demonstrates both.
///

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

function sendReceiveAndQuit(policy, minutesUntilSend) {
  var msgVal = Math.floor(Math.random() * 1000000);
  var min = 60 * 1000;
  var remaining = minutesUntilSend;
  return new Promise(function (resolve, reject) {
    var client = new AMQPClient(policy);
    client.on('client:errorReceived', function (err) {
      console.warn('===> CLIENT ERROR: ', err);
    });
    client.on('connection:closed', function() {
      console.warn('===> CONNECTION CLOSED');
    });
    client.connect(uri).then(function() {
      return client.createSender(queueName);
    })
      .then(function (sender) {
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
        setTimeout(function() {
          client.disconnect().then(function() {
            reject('Message not seen in ' + (minutesUntilSend + 1) + ' minutes');
          });
        }, (minutesUntilSend + 1) * min);
        var interval = setInterval(function() {
          remaining--;
          if (remaining === 0) {
            clearInterval(interval);
            client.createReceiver(queueName).then(function (receiver) {
              receiver.on('errorReceived', function (rx_err) {
                console.warn('===> RX ERROR: ', rx_err);
              });
              receiver.on('detached', function () {
                console.warn('===> RX DETACHED');
              });
              receiver.on('message', function (msg) {
                if (msg.body && msg.body.DataValue && msg.body.DataValue === msgVal) {
                  client.disconnect().then(function () {
                    console.log("\n=================\nExpected Value Seen\n==================\n");
                    resolve();
                  });
                }
              });
              sender.send({"DataString": "From Node", "DataValue": msgVal}).then(function (state) {
                console.log('State: ', state);
              }).catch(function (eSend) {
                console.warn('===> TX SEND FAILURE: ', eSend);
              });
            });
          } else {
            console.log('===> ' + remaining + ' minutes remaining until sending.');
          }
        }, min);
      })
  });
}

var noReattach = Policy.merge({ senderLink: { reattach: null }, receiverLink: { reattach: null } }, Policy.ServiceBusQueue);
var reattach = Policy.ServiceBusQueue;

var minutesUntilServiceBusDropsLink = 10;
var minutesUntilServiceBusDropsConnection = 20;
sendReceiveAndQuit(reattach, minutesUntilServiceBusDropsLink+ 1).then(function() {
  sendReceiveAndQuit(noReattach, minutesUntilServiceBusDropsConnection + 1).then(function() {
    console.log("\n==================\nComplete\n==================");
  });
});

