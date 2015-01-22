var Promise     = require('bluebird');
    AMQPClient  = require('./amqp_client');

Promise.promisifyAll(AMQPClient.prototype);

var uri = 'amqp://localhost/random2';
var msgId = Math.floor(Math.random() * 10000);

// Non-Promisified version:
//var client = new AMQPClient(uri, function () {
//    var msgStr = JSON.stringify({ "DataString": "From Node", "DataValue": msgId });
//    console.log('Sending ' + msgStr);
//    client.send(msgStr,
//        function (err, msg) {
//            if (err) {
//                console.log('ERROR: ');
//                console.log(err);
//            } else {
//                console.log('Sent: ' + msg);
//            }
//        });
//    client.receive(function (err, payload, annotations) {
//        if (err) {
//            console.log('ERROR: ');
//            console.log(err);
//        } else {
//            console.log('Recv: ');
//            console.log(payload);
//            if (annotations) {
//                console.log('Annotations:');
//                console.log(annotations);
//            }
//            console.log('');
//            try {
//                var asJson = JSON.parse(payload);
//                if (asJson.DataValue === msgId) {
//                    client.disconnect(function () {
//                        console.log("Received expected message.  Disconnected.");
//                    });
//                }
//            } catch (e) {
//                console.log("Error parsing payload " + payload);
//                console.log(e);
//            }
//        }
//    });
//});

// Promisified via Bluebird
var client = new AMQPClient();
client.connectAsync(uri).then(function () {
    var msgStr = JSON.stringify({"DataString": "From Node", "DataValue": msgId});
    console.log('Sending ' + msgStr);
    client.sendAsync(msgStr).then(function () {
        console.log('Sent');
    }).catch(function (e) {
        console.log('Error Sending ' + e);
    });
}).then(function() {
    client.receiveAsync().then(function (message) {
        var payload = message[0];
        var annotations = message[1];
        console.log('Recv: ');
        console.log(payload);
        if (annotations) {
            console.log('Annotations:');
            console.log(annotations);
        }
        console.log('');
        try {
            var asJson = JSON.parse(payload);
            if (asJson.DataValue === msgId) {
                client.disconnect(function () {
                    console.log("Received expected message.  Disconnected.");
                });
            }
        } catch (e) {
            console.log("Error parsing payload " + payload);
            console.log(e);
        }
    }).catch(function (e) { console.log('Error Receiving'); });
}).catch(function (e) {
    console.log('Error Connecting: ' + e);
});
