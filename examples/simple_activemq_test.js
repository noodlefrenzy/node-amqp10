'use strict';
//var AMQPClient = require('amqp10').Client;
var AMQPClient  = require('../lib').Client;

var uri = 'amqp://some.host/random2';
var msgId = Math.floor(Math.random() * 10000);

var client = new AMQPClient();
client.connect(uri).then(function () {
    var msgStr = JSON.stringify({"DataString": "From Node", "DataValue": msgId});
    console.log('Sending ' + msgStr);
    client.send(msgStr).then(function () {
        console.log('Sent');
    }).catch(function (e) {
        console.log('Error Sending ' + e);
    });
}).then(function() {
    client.createReceiver(function (err, message) {
        if (err) {
            console.log('Error Receiving ' + err);
        } else {
            console.log('Recv: ');
            console.log(message.body);
            if (message.annotations) {
                console.log('Annotations:');
                console.log(message.annotations);
            }
            console.log('');
            try {
                var asJson = JSON.parse(message.body);
                if (asJson.DataValue === msgId) {
                    client.disconnect(function () {
                        console.log("Received expected message.  Disconnected.");
                    });
                }
            } catch (e) {
                console.log("Error parsing payload " + message.body);
                console.log(e);
            }
        }
    });
}).catch(function (e) {
    console.log('Error Connecting: ' + e);
});
