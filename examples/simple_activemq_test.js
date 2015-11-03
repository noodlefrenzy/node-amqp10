'use strict';
//var AMQPClient = require('amqp10').Client;
var AMQPClient  = require('../lib').Client,
    Promise = require('bluebird');

var uri = 'amqp://some.host',
    msgId = Math.floor(Math.random() * 10000),
    client = new AMQPClient();

client.connect(uri)
  .then(function () {
    return Promise.all([
      client.createReceiver('amq.topic'),
      client.createSender('amq.topic')
    ]);
  })
  .spread(function(receiver, sender) {
    receiver.on('errorReceived', function(err) { console.log('error receiving: ', err); });
    receiver.on('message', function(message) {
      console.log('received: ', message.body);
      if (message.annotations) console.log('annotations: ', message.annotations);
      if (message.body.dataValue === msgId) {
        client.disconnect().then(function() {
          console.log('received expected message, disconnected.');
          process.exit(0);
        });
      }
    });

    var message = { dataString: "From Node", dataValue: msgId };
    console.log('sending: ', message);
    return sender.send(message).then(function (state) {
      // this can be used to optionally track the disposition of the sent message
      console.log('state: ', state);
    });
  })
  .error(function (e) {
    console.log('connection error: ', e);
  });
