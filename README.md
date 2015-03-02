node-amqp-1-0
=============

[![Build Status](https://secure.travis-ci.org/noodlefrenzy/node-amqp-1-0.png?branch=master)](https://travis-ci.org/noodlefrenzy/node-amqp-1-0)
[![Dependency Status](https://david-dm.org/noodlefrenzy/node-amqp-1-0.png)](https://david-dm.org/noodlefrenzy/node-amqp-1-0)

AMQP 1.0-compliant Node.js client.  Since AMQP 1.0 is such a large departure from 0.9.1, 
I've started a new project rather than fork from [node-amqp](https://github.com/postwait/node-amqp) or [amqp.node](https://github.com/squaremo/amqp.node).
Both node-amqp and amqp.node are great 0.9.1 clients and I recommend them, but neither is pursuing a 1.0 implementation.  If I can find an
easy way to integrate this code back into them, I'll definitely be submitting a PR.

## Usage ##

See `simple_eventhub_test.js` or `simple_activemq_test.js` for examples.

The basic usage is to require the module, new up a client with the appropriate policy for the server you're connecting against,
connect, and then send/receive as necessary.  So a simple example for a local ActiveMQ server would look like:

    var AMQPClient = require('node-amqp-1-0');
    var client = new AMQPClient(); // Uses PolicyBase default policy
    client.connect('amqp://localhost/myqueue', function(conn_err) {
      // ... check for errors ...
      client.send(JSON.stringify({ key: "Value" }), function (send_err) {
        // ... check for errors ...
      });
      client.receive(function (rx_err, payload, annotations) {
        // ... check for errors ...
        console.log('Rx message: ');
        console.log(JSON.parse(payload));
      });
    });

Note that the above JSON.stringify/JSON.parse on send/receive can be moved into the encoder/decoder methods on the policy object -
see the Event Hub policy for an example.

Send callbacks are called when the resulting disposition frame is received and the message is "settled".  To tune this behavior, you can
tweak the policy you give to AMQPClient on construction.  For instance, to force send callbacks to be called immediately on successful
sending of the payload, you would build AMQPClient with:

    var AMQPClient = require('node-amqp-1-0);
    var client = new AMQPClient(AMQPClient.policies.merge({
      senderLinkPolicy: {
        callbackPolicy: AMQPClient.policies.utils.SenderCallbackPolicies.OnSent
      }
    }, AMQPClient.policies.PolicyBase));

In addition to the above, you can also tune how message link credit is doled out (for throttling), as well as most other AMQP behaviors,
all through policy overrides.  See [PolicyBase](https://github.com/noodlefrenzy/node-amqp-1-0/blob/master/lib/policies/policy_base.js) and the [policy utilities](https://github.com/noodlefrenzy/node-amqp-1-0/blob/master/lib/policies/policy_utilities.js) for more details on altering various behaviors.

*NOTE*: This is early days - if you have ideas for an alternate API, please feel free to [open an issue](https://github.com/noodlefrenzy/node-amqp-1-0/issues/new) on GitHub.

## Caveats and Todos ##

I'm trying to manage my remaining work items via Github issues, but they aren't always kept up to date.  If you'd like to contribute,
feel free to send me an email or pull request.  Below is a high-level list of known open issues:

1. Disposition frames are not dealt with properly, and thus message lifecycles aren't tracked correctly.  Specifically, we don't
   send disposition frames on receipt, and we don't send proper "unsettled" information when re-attaching links.
2. There are some AMQP types we don't process - notably GUID, and the Decimal23/64/128 types.  These are unused by the protocol, and no-one seems to
   be using them to convey information in messages, so ignoring them is likely safe.

## Implementation Notes ##

Here are my current implementation notes - if you have feedback or critiques on any of these choices, feel free to
submit an Issue or even a PR.  Trust me, I don't take criticism personally, and I'm new to Nodejs so I could be making
"obviously bad" choices to someone who is more familiar with the landscape.

+   I've used Node's built-in net/tls classes for communicating with the server.
+   Data from the server is written to a circular buffer based on [CBarrick's](https://github.com/cbarrick/CircularBuffer).
+   Outgoing data is encoded using [this buffer builder](https://github.com/PeterReid/node-buffer-builder) - streaming
    output won't really work since each outgoing payload needs to be prefixed with its encoded size.
+   The connection state is managed using [Stately.js](https://github.com/fschaefer/Stately.js), with state transitions
    swapping which callback gets invoked on receipt of new data. (e.g. post-connection, we write the AMQP version header
    and then install a callback to ensure the correct version.  Once incoming data is written to the circular buffer, this
    callback is invoked, and a comparison vs. the expected version triggers another transition).
+   Bit-twiddling is done via [node-butils](https://github.com/nlf/node-butils).
+   Debug output is done via [debug](https://www.npmjs.com/package/debug) with the prefix `amqp10-`.  The main client's debug
    name is `amqp10-client` so setting `DEBUG=amqp10-client` will get you all top-level debugging output.

Further, detailed implementation nodes are available in the [API Readme](api/).

## License ##

MIT License.  If you need a more permissive license, or you want to try your hand at integrating this code into
node-amqp or amqp.node and need to match their license, let me know (i.e. open an issue).
