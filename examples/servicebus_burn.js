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

function sendReceiveMore(previous, minutesUntilSend) {
  var msgVal = Math.floor(Math.random() * 1000000);
  var min = 60 * 1000;
  var remaining = minutesUntilSend;

  return new Promise(function (resolve, reject) {
    var client = previous.client;
    var sender = previous.sender;
    var interval = setInterval(function() {
      remaining--;
      if (remaining === 0) {
        clearInterval(interval);
        // Note that if you create the receiver at the same time as the sender,
        //  it doesn't seem to trigger the behavior (i.e. an active receiver link stops the auto-detach).
        client.createReceiver(queueName).then(function (receiver) {
          receiver.on('errorReceived', function (rx_err) {
            console.warn('===> RX ERROR: ', rx_err);
          });
          receiver.on('detached', function () {
            console.warn('===> RX DETACHED');
          });
          receiver.on('message', function (msg) {
            if (msg.body && msg.body.DataValue && msg.body.DataValue === msgVal) {
              receiver.detach().then(function () {
                console.log("\n=================\nExpected Value Seen\n==================\n");
                resolve({client: client, sender: sender});
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

  });
}

function sendReceive(policy, minutesUntilSend) {
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
        var interval = setInterval(function() {
          remaining--;
          if (remaining === 0) {
            clearInterval(interval);
            // Note that if you create the receiver at the same time as the sender,
            //  it doesn't seem to trigger the behavior (i.e. an active receiver link stops the auto-detach).
            client.createReceiver(queueName).then(function (receiver) {
              receiver.on('errorReceived', function (rx_err) {
                console.warn('===> RX ERROR: ', rx_err);
              });
              receiver.on('detached', function () {
                console.warn('===> RX DETACHED');
              });
              receiver.on('message', function (msg) {
                if (msg.body && msg.body.DataValue && msg.body.DataValue === msgVal) {
                  receiver.detach().then(function () {
                    console.log("\n=================\nExpected Value Seen\n==================\n");
                    resolve({client: client, sender: sender});
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

var minutesUntilServiceBusDropsConnection = 20;
sendReceive(noReattach, minutesUntilServiceBusDropsConnection + 1).then(function(state) {
  console.log('==============> COMPLETED FIRST <==================');
  sendReceiveMore(state, minutesUntilServiceBusDropsConnection + 1).then(function () {
    console.log('==============> COMPLETED SECOND <==================');
    sendReceiveMore(state, minutesUntilServiceBusDropsConnection).then(function() {
      console.log('==============> COMPLETED ALL <==================');
    })
  });
});

