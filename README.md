amqp10
=============

[![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![coverage][coverage-image]][coverage-url] [![npm][npm-dl-image]][npm-url] [![gitter][gitter-image]][gitter-url]

amqp10 is a promise-based, AMQP 1.0 compliant node.js client

[travis-image]: https://img.shields.io/travis/noodlefrenzy/node-amqp10.svg
[travis-url]: https://travis-ci.org/noodlefrenzy/node-amqp10
[npm-image]: https://img.shields.io/npm/v/amqp10.svg
[npm-url]: https://npmjs.org/package/amqp10
[npm-dl-image]: https://img.shields.io/npm/dm/amqp10.svg
[coverage-image]: https://codeclimate.com/github/noodlefrenzy/node-amqp10/badges/coverage.svg
[coverage-url]: https://codeclimate.com/github/noodlefrenzy/node-amqp10
[gitter-image]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/noodlefrenzy/node-amqp10?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge

Contents
--------

* [Usage](#usage)
* [Documentation](https://noodlefrenzy.github.io/node-amqp10/)
* [Examples](https://github.com/noodlefrenzy/node-amqp10/tree/master/examples)

Usage
---------------

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
sent message, at this point the message is considered "settled".  To tune this behavior, you can tweak
the policy you give to AMQPClient on construction.  For instance, to force send promises to be resolved
immediately on successful sending of the payload, you would build AMQPClient like so:

    var AMQPClient = require('amqp10').Client,
        Policy = require('amqp10').Policy;
    var client = new AMQPClient(Policy.merge({
      senderLinkPolicy: {
        callbackPolicy: Policy.Utils.SenderCallbackPolicies.OnSent
      }
    }, Policy.DefaultPolicy));

In addition to the above, you can also tune how message link credit is doled out (for throttling), as
well as most other AMQP behaviors, all through policy overrides.  See [DefaultPolicy](https://github.com/noodlefrenzy/node-amqp10/blob/master/lib/policies/default_policy.js)
and the [policy utilities](https://github.com/noodlefrenzy/node-amqp10/blob/master/lib/policies/policy_utilities.js)
for more details on altering various behaviors.

Flow Control and Message Dispositions
----------------------------------------

Flow control in AMQP occurs at both the `Session` and `Link` layers. Using our default policy, we start out with some sensible Session windows and Link credits, and renew those every time they get to the half-way point. In addition, receiver links start in "auto-settle" mode, which means that the sender side can consider the message "settled" as soon as it's sent. However, _all_ of those settings are easily tune-able through Policy overrides (`Policy.merge(<overrides>, <base policy>)`).

For instance. we've provided a convenience helper for throttling your receiver links to only renew credits on messages they've "settled". To use this with Azure ServiceBus Queues for instance, it would look like:

    var AMQPClient = require('amqp10').Client,
        Policy = require('amqp10').Policy;
    var client = new AMQPClient(Policy.Utils.RenewOnSettle(1, 1, Policy.ServiceBusQueue));

Where the first number is the initial credit, and the second is the _threshold_ - once remaining credit goes below that, we will give out more credit by the number of messages we've settled. In this case we're setting up the client for one-by-one message processing. Behind the scenes, this does the following:

1. Sets the Link's creditQuantum to the first number (1), which you can do for yourself via the Policy mix-in `{ receiverLink: { creditQuantum: 1 } }`

2. Sets the Link to not auto-settle messages at the sender, which you can do for yourself via `{ receiverLink: { attach: { receiverSettleMode: 1 } } }`
 Where did that magic "1" come from? Well, that's the value from the spec, but you could use the constant we've defined at `require('amqp10').Constants.receiverSettleMode.settleOnDisposition`

3. Sets the Link's credit renewal policy to a custom method that renews only when the link credit is below the threshold and we've settled some messages. You can do this yourself by using your own custom method:
```
{
  receiverLink: {
    credit: function (link, options) {
      // If the receiver link was just connected, set the initial link credit to the quantum. Otherwise, give more credit for every message we've settled.
      var creditQuantum = (!!options && options.initial) ? link.policy.creditQuantum : link.settledMessagesSinceLastCredit;
      if (creditQuantum > 0 && link.linkCredit < threshold) {
        link.addCredits(creditQuantum);
      }
    }
  }
}
```

Note that once you've set the policy to not auto-settle messages, you'll need to settle them yourself. We've tried to make that easy by providing methods on the receiver link for each of the possible "disposition states" that AMQP allows:

* `link.accept(message)` will tell the sender that you've accepted and processed the message.
* `link.reject(message, [error])` will reject the message with the given error (if provided). The sender is free to re-deliver, so this can be used to indicate transient errors.
* `link.modify(message, [options])` will tell the sender to modify the message and re-deliver. You can tell it you can't accept the message by using `link.modify(message, { undeliverableHere: true })`
* `link.release(message)` will tell the sender that you haven't processed the message and it's free to re-deliver - even back to you.

All of these methods accept an array of messages, allowing you to settle many at once.

Plugins
---------------

The amqp10 module now supports pluggable Client behaviors with the exported `use` method. Officially supported plugins include:

+ [amqp10-link-cache](https://github.com/mbroadst/amqp10-link-cache) - caches links with optional purging based on ttl
+ [amqp10-rpc](https://github.com/mbroadst/amqp10-rpc) - an rpc server/client implementation on top of amqp10

Supported Servers
-------------------

We are currently actively running integration tests against the following servers:

1. Azure EventHubs
1. Azure ServiceBus Queues and Topics
1. Apache Qpid C++ broker (qpidd)

We have been tested against the following servers, but not exhaustively so issues may remain:

1. ActiveMQ (open issue related to ActiveMQ ignoring the auto-settle setting and disposition frames may cause messages to re-deliver or stop sending after a certain period)
1. RabbitMQ with the amqp 1.0 experimental extension
1. Apache Qpid Java broker

If you find any issues, please report them via GitHub.

Todos and Known Issues
--------------------------

1. Disposition support is incomplete in that we don't send proper "unsettled" information when re-attaching links.
1. There are some AMQP types we don't process - notably the Decimal23/64/128 types.  These are unused by the protocol, and no-one seems to
   be using them to convey information in messages, so ignoring them is likely safe.

Implementation Notes
---------------------------

+   Using node's built-in net/tls classes for communicating with the server.

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

+   Many thanks to Gordon Sim for inspiration on the type system, gleaned from his project [rhea](https://github.com/grs/rhea).
