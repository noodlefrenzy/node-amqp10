var AMQPClient  = require('./amqp_client');

var uri = 'amqp://localhost/random2';
var msgId = Math.floor(Math.random() * 10000);
var client = new AMQPClient(uri, function () {
    var msgStr = JSON.stringify({ "DataString": "From Node", "DataValue": msgId });
    console.log('Sending ' + msgStr);
    client.send(msgStr,
        function (err, msg) {
            if (err) {
                console.log('ERROR: ');
                console.log(err);
            } else {
                console.log('Sent: ' + msg);
            }
        });
    client.receive(function (err, payload, annotations) {
        if (err) {
            console.log('ERROR: ');
            console.log(err);
        } else {
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
        }
    });
});

