## Classes

<dl>
<dt><a href="#AMQPClient">AMQPClient</a> ⇐ <code>EventEmitter</code></dt>
<dd></dd>
<dt><a href="#Link">Link</a> ⇐ <code>EventEmitter</code></dt>
<dd></dd>
<dt><a href="#ReceiverLink">ReceiverLink</a> ⇐ <code><a href="#Link">Link</a></code></dt>
<dd></dd>
<dt><a href="#SenderLink">SenderLink</a> ⇐ <code><a href="#Link">Link</a></code></dt>
<dd></dd>
<dt><a href="#Policy">Policy</a></dt>
<dd></dd>
</dl>

<a name="AMQPClient"></a>

## AMQPClient
**Extends:** <code>EventEmitter</code>  
**Emits**: <code>[client:errorReceived](#AMQPClient+client_errorReceived)</code>, <code>[connection:opened](#AMQPClient+connection_opened)</code>, <code>[connection:closed](#AMQPClient+connection_closed)</code>  


* [AMQPClient](#user-content-AMQPClient)
  * _Methods_
    * [connect(url, [policyOverrides])](#user-content-AMQPClient+connect)
    * [createReceiver(address, [policyOverrides])](#user-content-AMQPClient+createReceiver)
    * [createReceiverStream(address, [policyOverrides])](#user-content-AMQPClient+createReceiverStream)
    * [createSender(address, [policyOverrides])](#user-content-AMQPClient+createSender)
    * [createSenderStream(address, [policyOverrides])](#user-content-AMQPClient+createSenderStream)
    * [disconnect()](#user-content-AMQPClient+disconnect)
  * _Events_
    * ['client:errorReceived'](#user-content-AMQPClient+client_errorReceived)
    * ['connection:closed'](#user-content-AMQPClient+connection_closed)
    * ['connection:opened'](#user-content-AMQPClient+connection_opened)

<a name="new_AMQPClient_new"></a>

### new AMQPClient([policy], [policyOverrides])

| Param | Type | Description |
| --- | --- | --- |
| [policy] | <code>[Policy](#Policy)</code> | Policy to use for connection, sessions, links, etc.  Defaults to DefaultPolicy. |
| [policyOverrides] | <code>Obeject</code> | Additional overrides for the provided policy |


AMQPClient is the top-level class for interacting with node-amqp10.  Instantiate this class, connect, and then send/receive
as needed and behind the scenes it will do the appropriate work to setup and teardown connections, sessions, and links and manage flow.
The code does its best to avoid exposing AMQP-specific types and attempts to convert them where possible, but on the off-chance you
need to speak AMQP-specific (e.g. to set a filter to a described-type), you can use node-amqp-encoder and the
translator adapter to convert it to our internal types.  See simple_eventhub_test.js for an example.

Configuring AMQPClient is done through a Policy class.  By default, DefaultPolicy will be used - it assumes AMQP defaults wherever
possible, and for values with no spec-defined defaults it tries to assume something reasonable (e.g. timeout, max message size).

To define a new policy, you can merge your values into an existing one by calling AMQPClient.policies.merge(yourPolicy, existingPolicy).
This does a deep-merge, allowing you to only replace values you need.  For instance, if you wanted the default sender settle policy to be auto-settle instead of mixed,
you could just use

 <pre>
 var AMQP = require('amqp10');
 var client = new AMQP.Client(AMQP.Policy.merge({
   senderLink: {
     attach: {
       senderSettleMode: AMQP.Constants.senderSettleMode.settled
     }
   }
 });
 </pre>

Obviously, setting some of these options requires some in-depth knowledge of AMQP, so I've tried to define specific policies where I can.
For instance, for Azure EventHub connections, you can use the pre-build EventHubPolicy.

Also, within the policy, see the encoder and decoder defined in the send/receive policies.  These define what to do with the message
sent/received, and by default do a simple pass-through, leaving the encoding to/decoding from AMQP-specific types up to the library which
does a best-effort job.  See EventHubPolicy for a more complicated example, turning objects into UTF8-encoded buffers of JSON-strings.

<a name="AMQPClient+connect"></a>

### amqpClient.connect(url, [policyOverrides])

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | URI to connect to - right now only supports <code>amqp|amqps</code> as protocol. |
| [policyOverrides] | <code>object</code> | Policy overrides used for creating this connection |


Connects to a given AMQP server endpoint. Sets the default queue, so e.g.
amqp://my-activemq-host/my-queue-name would set the default queue to
my-queue-name for future send/receive calls.

<a name="AMQPClient+createReceiver"></a>

### amqpClient.createReceiver(address, [policyOverrides])

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | An address to connect this link to.  If not provided will use default queue from connection uri. |
| [policyOverrides] | <code>object</code> | Policy overrides used for creating this receiver link |
| [policyOverrides.name] | <code>string</code> | Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name] |


Creates a receiver link for the given address, with optional link policy. The
promise returned resolves to a link that is an EventEmitter, which can be
used to listen for 'message' events.

<a name="AMQPClient+createReceiverStream"></a>

### amqpClient.createReceiverStream(address, [policyOverrides])

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | Address used for link creation |
| [policyOverrides] | <code>object</code> | Policy overrides used for creating the receiver link |


Creates a receiver link wrapped as a Readable stream

<a name="AMQPClient+createSender"></a>

### amqpClient.createSender(address, [policyOverrides])

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | An address to connect this link to. If not provided will use default queue from connection uri. |
| [policyOverrides] | <code>object</code> | Policy overrides used for creating this sender link |
| [policyOverrides.name] | <code>string</code> | Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name] |


Creates a sender link for the given address, with optional link policy

<a name="AMQPClient+createSenderStream"></a>

### amqpClient.createSenderStream(address, [policyOverrides])

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | Address used for link creation |
| [policyOverrides] | <code>object</code> | Policy overrides used for creating this sender link |


Creates a sender link wrapped as a Writable stream

<a name="AMQPClient+disconnect"></a>

### amqpClient.disconnect()

Disconnect tears down any existing connection with appropriate Close
performatives and TCP socket teardowns.

<a name="AMQPClient+client_errorReceived"></a>

### Event: 'client:errorReceived'

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| the | <code>object</code> | error received |

Error received events

<a name="AMQPClient+connection_closed"></a>

### Event: 'connection:closed'

Connection closed event.

<a name="AMQPClient+connection_opened"></a>

### Event: 'connection:opened'

Connection opened event.

<a name="Link"></a>

## Link
**Extends:** <code>EventEmitter</code>  
**Emits**: <code>[errorReceived](#Link+event_errorReceived)</code>, <code>[attached](#Link+event_attached)</code>, <code>[detached](#Link+event_detached)</code>  


* [Link](#user-content-Link)
  * _Methods_
    * [detach([options])](#user-content-Link+detach)
  * _Events_
    * ['attached'](#user-content-Link+event_attached)
    * ['detached'](#user-content-Link+event_detached)
    * ['errorReceived' (error)](#user-content-Link+event_errorReceived)

<a name="Link+detach"></a>

### link.detach([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> | detach frame options |


Detach the link from the session

<a name="Link+event_attached"></a>

### Event: 'attached'

Attached event

<a name="Link+event_detached"></a>

### Event: 'detached'

Detached event

<a name="Link+event_errorReceived"></a>

### Event: 'errorReceived'

| Param | Type | Description |
| --- | --- | --- |
| error | <code>object</code> | the received error |


Error received event

<a name="ReceiverLink"></a>

## ReceiverLink
**Extends:** <code>[Link](#Link)</code>  
**Emits**: <code>[message](#ReceiverLink+event_message)</code>  


* [ReceiverLink](#user-content-ReceiverLink)
  * _Methods_
    * [accept(message)](#user-content-ReceiverLink+accept)
    * [addCredits(credits, [flowOptions])](#user-content-ReceiverLink+addCredits)
    * [detach([options])](#user-content-Link+detach)
    * [modify(message, [options])](#user-content-ReceiverLink+modify)
    * [reject(message, [error])](#user-content-ReceiverLink+reject)
    * [release(message)](#user-content-ReceiverLink+release)
    * [settle(message, [state])](#user-content-ReceiverLink+settle)
  * _Events_
    * ['attached'](#user-content-Link+event_attached)
    * ['creditChange'](#user-content-ReceiverLink+event_creditChange)
    * ['detached'](#user-content-Link+event_detached)
    * ['errorReceived' (error)](#user-content-Link+event_errorReceived)
    * ['message' (message, [transferFrame])](#user-content-ReceiverLink+event_message)

<a name="ReceiverLink+accept"></a>

### receiverLink.accept(message)

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> &#124; <code>array</code> | message, or array of messages to settle |


Settle a message (or array of messages) with an Accepted delivery outcome

<a name="ReceiverLink+addCredits"></a>

### receiverLink.addCredits(credits, [flowOptions])

| Param | Type | Description |
| --- | --- | --- |
| credits | <code>number</code> | number of credits to add |
| [flowOptions] | <code>object</code> | additional options to include in flow frame |


Add credits to this link

<a name="Link+detach"></a>

### receiverLink.detach([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> | detach frame options |


Detach the link from the session

<a name="ReceiverLink+modify"></a>

### receiverLink.modify(message, [options])

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> &#124; <code>array</code> | message, or array of messages to settle |
| [options] | <code>object</code> | options used for a Modified outcome |
| [options.deliveryFailed] | <code>boolean</code> | count the transfer as an unsuccessful delivery attempt |
| [options.undeliverableHere] | <code>boolean</code> | prevent redelivery |
| [options.messageAnnotations] | <code>object</code> | message attributes to combine with existing annotations |


Settle a message (or array of messages) with a Modified delivery outcome

<a name="ReceiverLink+reject"></a>

### receiverLink.reject(message, [error])

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> &#124; <code>array</code> | message, or array of messages to settle |
| [error] | <code>string</code> | error that caused the message to be rejected |


Settle a message (or array of messages) with a Rejected delivery outcome

<a name="ReceiverLink+release"></a>

### receiverLink.release(message)

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> &#124; <code>array</code> | message, or array of messages to settle |


Settle a message (or array of messages) with a Released delivery outcome

<a name="ReceiverLink+settle"></a>

### receiverLink.settle(message, [state])

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> &#124; <code>array</code> | message, or array of messages to settle |
| [state] | <code>object</code> | outcome of message delivery |


Settle a message (or array of messages) with a given delivery state

<a name="Link+event_attached"></a>

### Event: 'attached'

Attached event

<a name="ReceiverLink+event_creditChange"></a>

### Event: 'creditChange'

Credit change event

<a name="Link+event_detached"></a>

### Event: 'detached'

Detached event

<a name="Link+event_errorReceived"></a>

### Event: 'errorReceived'

| Param | Type | Description |
| --- | --- | --- |
| error | <code>object</code> | the received error |


Error received event

<a name="ReceiverLink+event_message"></a>

### Event: 'message'

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | the received message |
| [transferFrame] | <code>object</code> | the transfer frame the message was extracted from |


Message received event.  Message payload given as argument.

<a name="SenderLink"></a>

## SenderLink
**Extends:** <code>[Link](#Link)</code>  


* [SenderLink](#user-content-SenderLink)
  * _Methods_
    * [detach([options])](#user-content-Link+detach)
    * [send(msg, [options])](#user-content-SenderLink+send)
  * _Events_
    * ['attached'](#user-content-Link+event_attached)
    * ['detached'](#user-content-Link+event_detached)
    * ['errorReceived' (error)](#user-content-Link+event_errorReceived)

<a name="Link+detach"></a>

### senderLink.detach([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> | detach frame options |


Detach the link from the session

<a name="SenderLink+send"></a>

### senderLink.send(msg, [options])

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>object</code> &#124; <code>string</code> &#124; <code>array</code> | Message to send.  Will be encoded using sender link policy's encoder. |
| [options] | <code>object</code> | An object of options to attach to the message including: annotations, properties,                           and application properties |
| [options.callback] | <code>string</code> | Determines when the send operation should callback. Possible                                    options are: 'sent', 'settled' and 'none'. For the best performance                                    choose 'none', which is essentially "send and forget" and notably will                                    not return a promise. |
| [options.annotations] | <code>object</code> | Annotations for the message, if any.  See AMQP spec for details, and server for specific                                       annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd                                       map is given, it will be translated to appropriate internal types.  Simple maps will be converted                                       to AMQP Fields type as defined in the spec. |


Sends the given message, with the given options on this link

<a name="Link+event_attached"></a>

### Event: 'attached'

Attached event

<a name="Link+event_detached"></a>

### Event: 'detached'

Detached event

<a name="Link+event_errorReceived"></a>

### Event: 'errorReceived'

| Param | Type | Description |
| --- | --- | --- |
| error | <code>object</code> | the received error |


Error received event

<a name="Policy"></a>

## Policy


* [Policy](#user-content-Policy)
  * _Methods_
    * [parseAddress(address)](#user-content-Policy+parseAddress)
    * [parseLinkAddress(address)](#user-content-Policy+parseLinkAddress)
  * _Properties_
    * [connect](#user-content-Policy.connect)
      * _Properties_
        * [options](#user-content-Policy.connect.options)
          * _Properties_
            * [channelMax](#user-content-Policy.connect.options.channelMax)
            * [containerId](#user-content-Policy.connect.options.containerId)
            * [desiredCapabilities](#user-content-Policy.connect.options.desiredCapabilities)
            * [hostname](#user-content-Policy.connect.options.hostname)
            * [idleTimeout](#user-content-Policy.connect.options.idleTimeout)
            * [incomingLocales](#user-content-Policy.connect.options.incomingLocales)
            * [maxFrameSize](#user-content-Policy.connect.options.maxFrameSize)
            * [offeredCapabilities](#user-content-Policy.connect.options.offeredCapabilities)
            * [outgoingLocales](#user-content-Policy.connect.options.outgoingLocales)
            * [properties](#user-content-Policy.connect.options.properties)
            * [sslOptions](#user-content-Policy.connect.options.sslOptions)
              * _Properties_
                * [caFile](#user-content-Policy.connect.options.sslOptions.caFile)
                * [certFile](#user-content-Policy.connect.options.sslOptions.certFile)
                * [keyFile](#user-content-Policy.connect.options.sslOptions.keyFile)
        * [saslMechanism](#user-content-Policy.connect.saslMechanism)
    * [defaultSubjects](#user-content-Policy.defaultSubjects)
    * [receiverLink](#user-content-Policy.receiverLink)
      * _Properties_
        * [attach](#user-content-Policy.receiverLink.attach)
          * _Properties_
            * [initialDeliveryCount](#user-content-Policy.receiverLink.attach.initialDeliveryCount)
            * [maxMessageSize](#user-content-Policy.receiverLink.attach.maxMessageSize)
            * [name](#user-content-Policy.receiverLink.attach.name)
            * [receiverSettleMode](#user-content-Policy.receiverLink.attach.receiverSettleMode)
            * [role](#user-content-Policy.receiverLink.attach.role)
        * [credit](#user-content-Policy.receiverLink.credit)
        * [creditQuantum](#user-content-Policy.receiverLink.creditQuantum)
        * [decoder](#user-content-Policy.receiverLink.decoder)
        * [reattach](#user-content-Policy.receiverLink.reattach)
    * [reconnect](#user-content-Policy.reconnect)
      * _Properties_
        * [forever](#user-content-Policy.reconnect.forever)
        * [retries](#user-content-Policy.reconnect.retries)
        * [strategy](#user-content-Policy.reconnect.strategy)
    * [senderLink](#user-content-Policy.senderLink)
      * _Properties_
        * [attach](#user-content-Policy.senderLink.attach)
          * _Properties_
            * [initialDeliveryCount](#user-content-Policy.senderLink.attach.initialDeliveryCount)
            * [maxMessageSize](#user-content-Policy.senderLink.attach.maxMessageSize)
            * [name](#user-content-Policy.senderLink.attach.name)
            * [role](#user-content-Policy.senderLink.attach.role)
            * [senderSettleMode](#user-content-Policy.senderLink.attach.senderSettleMode)
        * [callback](#user-content-Policy.senderLink.callback)
        * [encoder](#user-content-Policy.senderLink.encoder)
        * [reattach](#user-content-Policy.senderLink.reattach)
    * [session](#user-content-Policy.session)
      * _Properties_
        * [enableSessionFlowControl](#user-content-Policy.session.enableSessionFlowControl)
        * [options](#user-content-Policy.session.options)
          * _Properties_
            * [incomingWindow](#user-content-Policy.session.options.incomingWindow)
            * [nextOutgoingId](#user-content-Policy.session.options.nextOutgoingId)
            * [outgoingWindow](#user-content-Policy.session.options.outgoingWindow)
        * [window](#user-content-Policy.session.window)
        * [windowQuantum](#user-content-Policy.session.windowQuantum)

<a name="new_Policy_new"></a>

### new Policy(overrides)

| Param | Type | Description |
| --- | --- | --- |
| overrides | <code>object</code> | override values for the default policy |


The default policy for amqp10 clients

<a name="Policy+parseAddress"></a>

### policy.parseAddress(address)

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | the address to parse |


Parses an address for use when connecting to an AMQP 1.0 broker

<a name="Policy+parseLinkAddress"></a>

### policy.parseLinkAddress(address)

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> | the address to parse |


Parses a link address used for creating Sender and Receiver links.

The resulting object has a required `name` property (used as the source
address in the attach performative), as well as an optional `subject` property
which (if specified) will automatically create a source filter.

<a name="Policy.connect"></a>

### Policy.connect


* [connect](#user-content-Policy.connect)
  * _Properties_
    * [options](#user-content-Policy.connect.options)
      * _Properties_
        * [channelMax](#user-content-Policy.connect.options.channelMax)
        * [containerId](#user-content-Policy.connect.options.containerId)
        * [desiredCapabilities](#user-content-Policy.connect.options.desiredCapabilities)
        * [hostname](#user-content-Policy.connect.options.hostname)
        * [idleTimeout](#user-content-Policy.connect.options.idleTimeout)
        * [incomingLocales](#user-content-Policy.connect.options.incomingLocales)
        * [maxFrameSize](#user-content-Policy.connect.options.maxFrameSize)
        * [offeredCapabilities](#user-content-Policy.connect.options.offeredCapabilities)
        * [outgoingLocales](#user-content-Policy.connect.options.outgoingLocales)
        * [properties](#user-content-Policy.connect.options.properties)
        * [sslOptions](#user-content-Policy.connect.options.sslOptions)
          * _Properties_
            * [caFile](#user-content-Policy.connect.options.sslOptions.caFile)
            * [certFile](#user-content-Policy.connect.options.sslOptions.certFile)
            * [keyFile](#user-content-Policy.connect.options.sslOptions.keyFile)
    * [saslMechanism](#user-content-Policy.connect.saslMechanism)

<a name="Policy.connect.options"></a>

#### connect.options

Options passed into the open performative on initial connection


* [options](#user-content-Policy.connect.options)
  * _Properties_
    * [channelMax](#user-content-Policy.connect.options.channelMax)
    * [containerId](#user-content-Policy.connect.options.containerId)
    * [desiredCapabilities](#user-content-Policy.connect.options.desiredCapabilities)
    * [hostname](#user-content-Policy.connect.options.hostname)
    * [idleTimeout](#user-content-Policy.connect.options.idleTimeout)
    * [incomingLocales](#user-content-Policy.connect.options.incomingLocales)
    * [maxFrameSize](#user-content-Policy.connect.options.maxFrameSize)
    * [offeredCapabilities](#user-content-Policy.connect.options.offeredCapabilities)
    * [outgoingLocales](#user-content-Policy.connect.options.outgoingLocales)
    * [properties](#user-content-Policy.connect.options.properties)
    * [sslOptions](#user-content-Policy.connect.options.sslOptions)
      * _Properties_
        * [caFile](#user-content-Policy.connect.options.sslOptions.caFile)
        * [certFile](#user-content-Policy.connect.options.sslOptions.certFile)
        * [keyFile](#user-content-Policy.connect.options.sslOptions.keyFile)

<a name="Policy.connect.options.channelMax"></a>

##### options.channelMax

The channel-max value is the highest channel number that can be used on the connection

<a name="Policy.connect.options.containerId"></a>

##### options.containerId

The id of the source container

<a name="Policy.connect.options.desiredCapabilities"></a>

##### options.desiredCapabilities

The desired-capability list defines which extension capabilities the sender may
use if the receiver offers them

<a name="Policy.connect.options.hostname"></a>

##### options.hostname

The name of the target host

<a name="Policy.connect.options.idleTimeout"></a>

##### options.idleTimeout

The idle timeout required by the sender

<a name="Policy.connect.options.incomingLocales"></a>

##### options.incomingLocales

A list of locales that the sending peer permits for incoming informational text

<a name="Policy.connect.options.maxFrameSize"></a>

##### options.maxFrameSize

The largest frame size that the sending peer is able to accept on this connection

<a name="Policy.connect.options.offeredCapabilities"></a>

##### options.offeredCapabilities

A list of extension capabilities the peer may use if the sender offers them

<a name="Policy.connect.options.outgoingLocales"></a>

##### options.outgoingLocales

A list of the locales that the peer supports for sending informational text

<a name="Policy.connect.options.properties"></a>

##### options.properties

The properties map contains a set of fields intended to indicate information
about the connection and its container

<a name="Policy.connect.options.sslOptions"></a>

##### options.sslOptions

Options used to initiate a TLS/SSL connection, with the exception of the
following options all options in this object are passed directly to node's
[tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) method.


* [sslOptions](#user-content-Policy.connect.options.sslOptions)
  * _Properties_
    * [caFile](#user-content-Policy.connect.options.sslOptions.caFile)
    * [certFile](#user-content-Policy.connect.options.sslOptions.certFile)
    * [keyFile](#user-content-Policy.connect.options.sslOptions.keyFile)

<a name="Policy.connect.options.sslOptions.caFile"></a>

###### sslOptions.caFile

Path to the file containing the trusted cert for the client

<a name="Policy.connect.options.sslOptions.certFile"></a>

###### sslOptions.certFile

Path to the file containing the certificate key for the client

<a name="Policy.connect.options.sslOptions.keyFile"></a>

###### sslOptions.keyFile

Path to the file containing the private key for the client

<a name="Policy.connect.saslMechanism"></a>

#### connect.saslMechanism

Allows the sasl mechanism to be overriden by policy

<a name="Policy.defaultSubjects"></a>

### Policy.defaultSubjects

support subjects in link names with the following characteristics:
receiver: "amq.topic/news", means a filter on the ReceiverLink will be made
          for messages send with a subject "news"

sender: "amq.topic/news", will automatically set "news" as the subject for
        messages sent on this link, unless the user explicitly overrides
        the subject.

<a name="Policy.receiverLink"></a>

### Policy.receiverLink


* [receiverLink](#user-content-Policy.receiverLink)
  * _Properties_
    * [attach](#user-content-Policy.receiverLink.attach)
      * _Properties_
        * [initialDeliveryCount](#user-content-Policy.receiverLink.attach.initialDeliveryCount)
        * [maxMessageSize](#user-content-Policy.receiverLink.attach.maxMessageSize)
        * [name](#user-content-Policy.receiverLink.attach.name)
        * [receiverSettleMode](#user-content-Policy.receiverLink.attach.receiverSettleMode)
        * [role](#user-content-Policy.receiverLink.attach.role)
    * [credit](#user-content-Policy.receiverLink.credit)
    * [creditQuantum](#user-content-Policy.receiverLink.creditQuantum)
    * [decoder](#user-content-Policy.receiverLink.decoder)
    * [reattach](#user-content-Policy.receiverLink.reattach)

<a name="Policy.receiverLink.attach"></a>

#### receiverLink.attach

Options passed into the `attach` performative on link attachment


* [attach](#user-content-Policy.receiverLink.attach)
  * _Properties_
    * [initialDeliveryCount](#user-content-Policy.receiverLink.attach.initialDeliveryCount)
    * [maxMessageSize](#user-content-Policy.receiverLink.attach.maxMessageSize)
    * [name](#user-content-Policy.receiverLink.attach.name)
    * [receiverSettleMode](#user-content-Policy.receiverLink.attach.receiverSettleMode)
    * [role](#user-content-Policy.receiverLink.attach.role)

<a name="Policy.receiverLink.attach.initialDeliveryCount"></a>

##### attach.initialDeliveryCount

This must not be null if role is sender, and it is ignored if the role is receiver.

<a name="Policy.receiverLink.attach.maxMessageSize"></a>

##### attach.maxMessageSize

The maximum message size supported by the link endpoint

<a name="Policy.receiverLink.attach.name"></a>

##### attach.name

This name uniquely identifies the link from the container of the source to
the container of the target node

<a name="Policy.receiverLink.attach.receiverSettleMode"></a>

##### attach.receiverSettleMode

The delivery settlement policy for the receiver

<a name="Policy.receiverLink.attach.role"></a>

##### attach.role

The role being played by the peer

<a name="Policy.receiverLink.credit"></a>

#### receiverLink.credit

A function that determines when (if ever) to refresh the receiver link's credit

<a name="Policy.receiverLink.creditQuantum"></a>

#### receiverLink.creditQuantum

Quantum used in pre-defined credit policy functions

<a name="Policy.receiverLink.decoder"></a>

#### receiverLink.decoder

The decoder used for all incoming data

<a name="Policy.receiverLink.reattach"></a>

#### receiverLink.reattach

Whether the link should attempt reattach on detach

<a name="Policy.reconnect"></a>

### Policy.reconnect

Options related to the reconnect behavior of the client. If this value is `null` reconnect
is effectively disabled


* [reconnect](#user-content-Policy.reconnect)
  * _Properties_
    * [forever](#user-content-Policy.reconnect.forever)
    * [retries](#user-content-Policy.reconnect.retries)
    * [strategy](#user-content-Policy.reconnect.strategy)

<a name="Policy.reconnect.forever"></a>

#### reconnect.forever

Whether or not to attempt reconnection forever

<a name="Policy.reconnect.retries"></a>

#### reconnect.retries

How many times to attempt reconnection

<a name="Policy.reconnect.strategy"></a>

#### reconnect.strategy

The algorithm used for backoff. Can be `fibonacci` or `exponential`

<a name="Policy.senderLink"></a>

### Policy.senderLink


* [senderLink](#user-content-Policy.senderLink)
  * _Properties_
    * [attach](#user-content-Policy.senderLink.attach)
      * _Properties_
        * [initialDeliveryCount](#user-content-Policy.senderLink.attach.initialDeliveryCount)
        * [maxMessageSize](#user-content-Policy.senderLink.attach.maxMessageSize)
        * [name](#user-content-Policy.senderLink.attach.name)
        * [role](#user-content-Policy.senderLink.attach.role)
        * [senderSettleMode](#user-content-Policy.senderLink.attach.senderSettleMode)
    * [callback](#user-content-Policy.senderLink.callback)
    * [encoder](#user-content-Policy.senderLink.encoder)
    * [reattach](#user-content-Policy.senderLink.reattach)

<a name="Policy.senderLink.attach"></a>

#### senderLink.attach

Options passed into the `attach` performative on link attachment


* [attach](#user-content-Policy.senderLink.attach)
  * _Properties_
    * [initialDeliveryCount](#user-content-Policy.senderLink.attach.initialDeliveryCount)
    * [maxMessageSize](#user-content-Policy.senderLink.attach.maxMessageSize)
    * [name](#user-content-Policy.senderLink.attach.name)
    * [role](#user-content-Policy.senderLink.attach.role)
    * [senderSettleMode](#user-content-Policy.senderLink.attach.senderSettleMode)

<a name="Policy.senderLink.attach.initialDeliveryCount"></a>

##### attach.initialDeliveryCount

This must not be null if role is sender, and it is ignored if the role is receiver.

<a name="Policy.senderLink.attach.maxMessageSize"></a>

##### attach.maxMessageSize

The maximum message size supported by the link endpoint

<a name="Policy.senderLink.attach.name"></a>

##### attach.name

This name uniquely identifies the link from the container of the source to
the container of the target node

<a name="Policy.senderLink.attach.role"></a>

##### attach.role

The role being played by the peer

<a name="Policy.senderLink.attach.senderSettleMode"></a>

##### attach.senderSettleMode

The delivery settlement policy for the sender

<a name="Policy.senderLink.callback"></a>

#### senderLink.callback

Determines when a send should call its callback.

<a name="Policy.senderLink.encoder"></a>

#### senderLink.encoder

The encoder used for all outgoing sends

<a name="Policy.senderLink.reattach"></a>

#### senderLink.reattach

Whether the link should attempt reattach on detach

<a name="Policy.session"></a>

### Policy.session


* [session](#user-content-Policy.session)
  * _Properties_
    * [enableSessionFlowControl](#user-content-Policy.session.enableSessionFlowControl)
    * [options](#user-content-Policy.session.options)
      * _Properties_
        * [incomingWindow](#user-content-Policy.session.options.incomingWindow)
        * [nextOutgoingId](#user-content-Policy.session.options.nextOutgoingId)
        * [outgoingWindow](#user-content-Policy.session.options.outgoingWindow)
    * [window](#user-content-Policy.session.window)
    * [windowQuantum](#user-content-Policy.session.windowQuantum)

<a name="Policy.session.enableSessionFlowControl"></a>

#### session.enableSessionFlowControl

Whether or not session flow control should be performed at all

<a name="Policy.session.options"></a>

#### session.options

Options passed into the `begin` performative on session start


* [options](#user-content-Policy.session.options)
  * _Properties_
    * [incomingWindow](#user-content-Policy.session.options.incomingWindow)
    * [nextOutgoingId](#user-content-Policy.session.options.nextOutgoingId)
    * [outgoingWindow](#user-content-Policy.session.options.outgoingWindow)

<a name="Policy.session.options.incomingWindow"></a>

##### options.incomingWindow

The maximum number of incoming transfer frames that the endpoint can currently receive

<a name="Policy.session.options.nextOutgoingId"></a>

##### options.nextOutgoingId

The transfer-id to assign to the next transfer frame

<a name="Policy.session.options.outgoingWindow"></a>

##### options.outgoingWindow

The maximum number of outgoing transfer frames that the endpoint can currently send

<a name="Policy.session.window"></a>

#### session.window

A function used to calculate how/when the flow control window should change

<a name="Policy.session.windowQuantum"></a>

#### session.windowQuantum

Quantum used in predefined window policies

