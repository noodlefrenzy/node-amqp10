amqp10
=============

[![Build Status](https://secure.travis-ci.org/noodlefrenzy/node-amqp10.svg?branch=master)](https://travis-ci.org/noodlefrenzy/node-amqp10)
[![Dependency Status](https://david-dm.org/noodlefrenzy/node-amqp10.svg)](https://david-dm.org/noodlefrenzy/node-amqp10)
[![Code Climate](https://codeclimate.com/github/noodlefrenzy/node-amqp10/badges/gpa.svg)](https://codeclimate.com/github/noodlefrenzy/node-amqp10)
[![Test Coverage](https://codeclimate.com/github/noodlefrenzy/node-amqp10/badges/coverage.svg)](https://codeclimate.com/github/noodlefrenzy/node-amqp10)
[![npm version](https://badge.fury.io/js/amqp10.svg)](http://badge.fury.io/js/amqp10)
[![Join the chat at https://gitter.im/noodlefrenzy/node-amqp10](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/noodlefrenzy/node-amqp10?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

amqp10 is a promise-based, AMQP 1.0 compliant node.js client

## Usage ##

See `simple_eventhub_test.js`, `simple_activemq_test.js` or any of the other files in [examples](https://github.com/noodlefrenzy/node-amqp10/tree/master/examples).

The basic usage is to require the module, new up a client with the appropriate policy for the server you're
connecting against, connect, and then send/receive as necessary.  So a simple example for a local Apache Qpid
server would look like:

    var AMQPClient = require('amqp10').Client,
        Promise = require('bluebird');

    var client = new AMQPClient(); // Uses PolicyBase default policy
    client.connect('amqp://localhost')
      .then(function() {
        return Promise.all([
          client.createReceiver('amq.topic'),
          client.createSender('amq.topic')
        ]);
      })
      .spread(function(receiver, sender) {
        receiver.on('errorReceived', function(err) { // check for errors });
        receiver.on('message', function(message) {
          console.log('Rx message: ', message.body);
        });

        return sender.send({ key: "Value" });
      })
      .error(function(err) {
        console.log("error: ", err);
      });

By default send promises are resolved when a disposition frame is received from the remote link for the
send message, at this point the message is considered "settled".  To tune this behavior, you can tweak
the policy you give to AMQPClient on construction.  For instance, to force send promises to be resolved
immediately on successful sending of the payload, you would build AMQPClient like so:

    var AMQPClient = require('amqp10').Client;
    var client = new AMQPClient(AMQPClient.policies.merge({
      senderLinkPolicy: {
        callbackPolicy: AMQPClient.policies.utils.SenderCallbackPolicies.OnSent
      }
    }, AMQPClient.policies.PolicyBase));

In addition to the above, you can also tune how message link credit is doled out (for throttling), as
well as most other AMQP behaviors, all through policy overrides.  See [DefaultPolicy](https://github.com/noodlefrenzy/node-amqp10/blob/master/lib/policies/default_policy.js)
and the [policy utilities](https://github.com/noodlefrenzy/node-amqp10/blob/master/lib/policies/policy_utilities.js)
for more details on altering various behaviors.

## Documentation ##
- [API Reference](https://github.com/noodlefrenzy/node-amqp10/tree/master/api)

## Supported Servers ##

We are currently actively running integration tests against the following servers:

1. Azure EventHubs
1. Azure ServiceBus Queues and Topics
1. Apache Qpid C++ broker (qpidd)

We have been tested against the following servers, but not exhaustively so issues may remain:

1. ActiveMQ (open issue related to ActiveMQ ignoring the auto-settle setting and disposition frames may cause messages to re-deliver or stop sending after a certain period)
1. RabbitMQ with the amqp 1.0 experimental extension
1. Apache Qpid Java broker

If you find any issues, please report them via GitHub.

## Todos and Known Issues ##

1. Disposition support is incomplete in that we don't send proper "unsettled" information when re-attaching links.
1. There are some AMQP types we don't process - notably the Decimal23/64/128 types.  These are unused by the protocol, and no-one seems to
   be using them to convey information in messages, so ignoring them is likely safe.

## Implementation Notes ##

+   Using node's built-in net/tls classes for communicating with the server.
+   Using [nodejs-websocket](https://github.com/sitegui/nodejs-websocket) for Azure IoT Hub support of AMQP over WebSockets.

+   Data from the server is written to a buffer-list based on [Rod Vagg's BL](https://github.com/rvagg/bl).

+   Outgoing data is encoded using [this buffer builder](https://github.com/PeterReid/node-buffer-builder) - streaming
    output won't really work since each outgoing payload needs to be prefixed with its encoded size, however we're working on
    converting to use as much streaming as possible.

+   The connection state is managed using [Stately.js](https://github.com/fschaefer/Stately.js), with state transitions
    swapping which callback gets invoked on receipt of new data. (e.g. post-connection, we write the AMQP version header
    and then install a callback to ensure the correct version.  Once incoming data is written to the circular buffer, this
    callback is invoked, and a comparison vs. the expected version triggers another transition).

+   Debug output is done via [debug](https://www.npmjs.com/package/debug) with the prefix `amqp10:`.  The main client's debug
    name is `amqp10:client` so setting `DEBUG=amqp10:client` as an environment variable will get you all top-level debugging output.
    ```bash
    bash# export DEBUG=amqp*
    ```
    
    ```bash
    C:\> set DEBUG=amqp*
    ```

    ```bash
    [root@pinguino]# node simple_eventhub_test.js
      amqp10:client connecting to: amqps://xxxxxx:xxxxxxxxx@xxxxxxxxxxxx.servicebus.windows.net +0ms
      amqp10:connection Connecting to xxxxxx-service-bus-001.servicebus.windows.net:5671 via TLS +72ms
      amqp10:connection Transitioning from DISCONNECTED to START due to connect +17ms
      amqp10:connection Sending Header 414d515003010000 +405ms
      amqp10:connection Transitioning from START to IN_SASL due to connected +6ms
      amqp10:connection Rx: 414d515003010000 +128ms
      amqp10:sasl Server SASL Version: 414d515003010000 vs 414d515003010000 +1ms
      amqp10:connection Rx: 0000003f02010000005340c03201e02f04b3000000074d535342434... +162ms
      amqp10:client Reading variable with prefix 0xc0 of length 52 +2ms
      amqp10:client Decoding 5340 +0ms
      [...]
    ```

Further, detailed implementation notes are available in the [API Readme](api/).
