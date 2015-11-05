'use strict';
var AMQPClient = require('../../lib').Client;

var client = new AMQPClient(),
    messageCount = parseInt(process.argv[2]) || 10,
    server = process.env.SERVER || 'localhost',
    receivedCount = 0,
    start, finish;

client.connect('amqp://' + server)
  .then(function() {
    return Promise.all([
      client.createReceiver('amq.topic'),
      client.createSender('amq.topic')
    ]);
  })
  .spread(function(receiver, sender) {
    receiver.on('message', function(message) {
      receivedCount++;
      if (receivedCount === messageCount) {
        finish = new Date();
        console.log('=> sent ' + messageCount + ' messages in ' + (finish.getTime() - start.getTime()) + 'ms');
        client.disconnect().then(function() { process.exit(0); });
      }
    });

    start = new Date();
    var promises = [];
    for (var i = 0; i < messageCount; i++)
      promises.push(sender.send('test'));
    return Promise.all(promises);
  });
