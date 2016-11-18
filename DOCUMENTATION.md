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
| [policy] | <code>Policy</code> | Policy to use for connection, sessions, links, etc.  Defaults to DefaultPolicy. |
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
| [options] | <code>object</code> | An object of options to attach to the message including: annotations, properties,                              and application properties |
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

