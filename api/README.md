## Classes
<dl>
<dt><a href="#AMQPClient">AMQPClient</a></dt>
<dd></dd>
<dt><a href="#Codec">Codec</a></dt>
<dd></dd>
<dt><a href="#Connection">Connection</a></dt>
<dd></dd>
<dt><a href="#Error">Error</a></dt>
<dd></dd>
<dt><a href="#AttachFrame">AttachFrame</a></dt>
<dd></dd>
<dt><a href="#BeginFrame">BeginFrame</a></dt>
<dd></dd>
<dt><a href="#CloseFrame">CloseFrame</a></dt>
<dd></dd>
<dt><a href="#DetachFrame">DetachFrame</a></dt>
<dd></dd>
<dt><a href="#DispositionFrame">DispositionFrame</a></dt>
<dd></dd>
<dt><a href="#EndFrame">EndFrame</a></dt>
<dd></dd>
<dt><a href="#FlowFrame">FlowFrame</a></dt>
<dd></dd>
<dt><a href="#FrameReader">FrameReader</a></dt>
<dd></dd>
<dt><a href="#Frame">Frame</a></dt>
<dd></dd>
<dt><a href="#AMQPFrame">AMQPFrame</a></dt>
<dd></dd>
<dt><a href="#HeartbeatFrame">HeartbeatFrame</a></dt>
<dd></dd>
<dt><a href="#OpenFrame">OpenFrame</a></dt>
<dd></dd>
<dt><a href="#SaslFrame">SaslFrame</a></dt>
<dd></dd>
<dt><a href="#SaslMechanisms">SaslMechanisms</a></dt>
<dd></dd>
<dt><a href="#SaslInit">SaslInit</a></dt>
<dd></dd>
<dt><a href="#SaslChallenge">SaslChallenge</a></dt>
<dd></dd>
<dt><a href="#SaslResponse">SaslResponse</a></dt>
<dd></dd>
<dt><a href="#SaslOutcome">SaslOutcome</a></dt>
<dd></dd>
<dt><a href="#TransferFrame">TransferFrame</a></dt>
<dd></dd>
<dt><a href="#Sasl">Sasl</a></dt>
<dd></dd>
<dt><a href="#Session">Session</a></dt>
<dd></dd>
<dt><a href="#Types">Types</a></dt>
<dd></dd>
<dt><a href="#AMQPArray">AMQPArray</a></dt>
<dd></dd>
<dt><a href="#AMQPSymbol">AMQPSymbol</a></dt>
<dd></dd>
<dt><a href="#DescribedType">DescribedType</a></dt>
<dd></dd>
<dt><a href="#ForcedType">ForcedType</a></dt>
<dd></dd>
<dt><a href="#Header">Header</a></dt>
<dd></dd>
<dt><a href="#DeliveryAnnotations">DeliveryAnnotations</a></dt>
<dd></dd>
<dt><a href="#Annotations">Annotations</a></dt>
<dd></dd>
<dt><a href="#Properties">Properties</a></dt>
<dd></dd>
<dt><a href="#ApplicationProperties">ApplicationProperties</a></dt>
<dd></dd>
<dt><a href="#Footer">Footer</a></dt>
<dd></dd>
<dt><a href="#Data">Data</a></dt>
<dd></dd>
<dt><a href="#AMQPSequence">AMQPSequence</a></dt>
<dd></dd>
<dt><a href="#AMQPValue">AMQPValue</a></dt>
<dd></dd>
<dt><a href="#Message">Message</a></dt>
<dd></dd>
</dl>
## Functions
<dl>
<dt><a href="#connect">connect(url)</a> ⇒ <code>Promise</code></dt>
<dd><p>Connects to a given AMQP server endpoint. Sets the default queue, so e.g.
amqp://my-activemq-host/my-queue-name would set the default queue to
my-queue-name for future send/receive calls.</p>
</dd>
<dt><a href="#createSender">createSender(address, [policyOverrides])</a> ⇒ <code>Promise</code></dt>
<dd><p>Creates a sender link for the given address, with optional link policy</p>
</dd>
<dt><a href="#createReceiver">createReceiver(address, [policyOverrides])</a> ⇒ <code>Promise</code></dt>
<dd><p>Creates a receiver link for the given address, with optional link policy. The
promise returned resolves to a link that is an EventEmitter, which can be
used to listen for &#39;message&#39; events.</p>
</dd>
<dt><a href="#disconnect">disconnect()</a> ⇒ <code>Promise</code></dt>
<dd><p>Disconnect tears down any existing connection with appropriate Close
performatives and TCP socket teardowns.</p>
</dd>
<dt><a href="#send">send(msg, [options])</a> ⇒ <code>Promise</code></dt>
<dd><p>Sends the given message, with the given options on this link</p>
</dd>
<dt><a href="#encoder">encoder(val, buf, [codec])</a></dt>
<dd><p>Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint will
encode to the fixed-zero-value, the short uint, or the full uint as appropriate).</p>
</dd>
<dt><a href="#decoder">decoder(buf, [codec])</a> ⇒</dt>
<dd><p>Decoder methods decode an incoming buffer into an appropriate concrete JS entity.</p>
</dd>
<dt><a href="#DeliveryState">DeliveryState()</a></dt>
<dd><p>Delivery state base class</p>
</dd>
<dt><a href="#Received">Received(sectionNumber, sectionOffset)</a></dt>
<dd><p>Received
The received outcome</p>
</dd>
<dt><a href="#Accepted">Accepted()</a></dt>
<dd><p>Accepted
The accepted state</p>
</dd>
<dt><a href="#Rejected">Rejected(error)</a></dt>
<dd><p>Reject
The rejected state</p>
</dd>
<dt><a href="#Released">Released()</a></dt>
<dd><p>Released
The released outcome.</p>
</dd>
<dt><a href="#Modified">Modified(deliveryFailed, undeliverableHere, messageAnnotations)</a></dt>
<dd><p>Modified
The modified outcome</p>
</dd>
<dt><a href="#encode">encode(val)</a></dt>
<dd><p>Encodes given value into node-amqp-encoder format.</p>
</dd>
<dt><a href="#onUndef">onUndef(arg1, arg2)</a> ⇒</dt>
<dd><p>Simple, <em>light-weight</em> function for coalescing an argument with a default.
Differs from <em>??</em> by operating <em>only</em> on undefined, and not on null/zero/empty-string/emtpy-array/etc.</p>
<p>Could use <em>args</em> and slice and work for arbitrary length argument list, but that would no longer be simple.</p>
</dd>
<dt><a href="#assertArguments">assertArguments(options, argnames)</a></dt>
<dd><p>Convenience method to assert that a given options object contains the required arguments.</p>
</dd>
</dl>
<a name="AMQPClient"></a>
## AMQPClient
**Kind**: global class  
<a name="new_AMQPClient_new"></a>
### new AMQPClient([policy])
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


| Param | Type | Description |
| --- | --- | --- |
| [policy] | <code>DefaultPolicy</code> | Policy to use for connection, sessions, links, etc.  Defaults to DefaultPolicy. |

<a name="Codec"></a>
## Codec
**Kind**: global class  

* [Codec](#Codec)
  * [new Codec()](#new_Codec_new)
  * [.decode(buf, [offset], [forcedCode])](#Codec+decode) ⇒ <code>Array</code>
  * [.encode(val, buf, [forceType])](#Codec+encode)

<a name="new_Codec_new"></a>
### new Codec()
Build a codec.

<a name="Codec+decode"></a>
### codec.decode(buf, [offset], [forcedCode]) ⇒ <code>Array</code>
Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.

**Kind**: instance method of <code>[Codec](#Codec)</code>  
**Returns**: <code>Array</code> - Single decoded value + number of bytes consumed.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| buf | <code>Buffer</code> &#124; <code>CBuffer</code> |  | The buffer/circular buffer to decode.  Will decode a single value per call. |
| [offset] | <code>Number</code> | <code>0</code> | The offset to read from (only used for Buffers). |
| [forcedCode] | <code>Number</code> |  | If given, will not consume first byte for code and will instead use this as the code. Useful for arrays. |

<a name="Codec+encode"></a>
### codec.encode(val, buf, [forceType])
Encode the given value as an AMQP 1.0 bitstring.We do a best-effort to determine type.  Objects will be encoded as <code>maps</code>, unless:+ They are DescribedTypes, in which case they will be encoded as such.+ They contain an encodeOrdering array, in which case they will be encoded as a <code>list</code> of their values  in the specified order.+ They are Int64s, in which case they will be encoded as <code>longs</code>.

**Kind**: instance method of <code>[Codec](#Codec)</code>  

| Param | Type | Description |
| --- | --- | --- |
| val |  | Value to encode. |
| buf | <code>builder</code> | buffer-builder to write into. |
| [forceType] | <code>string</code> | If set, forces the encoder for the given type. |

<a name="Connection"></a>
## Connection
**Kind**: global class  

* [Connection](#Connection)
  * [new Connection(connectPolicy)](#new_Connection_new)
  * [.open(address, sasl)](#Connection+open)

<a name="new_Connection_new"></a>
### new Connection(connectPolicy)
Connection states, from AMQP 1.0 spec:
 <dl>
 <dt>START</dt>
 <dd><p>In this state a Connection exists, but nothing has been sent or received. This is the
 state an implementation would be in immediately after performing a socket connect or
 socket accept.</p></dd>

 <dt>HDR-RCVD</dt>
 <dd><p>In this state the Connection header has been received from our peer, but we have not
 yet sent anything.</p></dd>

 <dt>HDR-SENT</dt>
 <dd><p>In this state the Connection header has been sent to our peer, but we have not yet
 received anything.</p></dd>

 <dt>OPEN-PIPE</dt>
 <dd><p>In this state we have sent both the Connection header and the open frame, but we have not yet received anything.
 </p></dd>

 <dt>OC-PIPE</dt>
 <dd><p>In this state we have sent the Connection header, the open
 frame, any pipelined Connection traffic, and the close frame,
 but we have not yet received anything.</p></dd>

 <dt>OPEN-RCVD</dt>
 <dd><p>In this state we have sent and received the Connection header, and received an
 open frame from our peer, but have not yet sent an
 open frame.</p></dd>

 <dt>OPEN-SENT</dt>
 <dd><p>In this state we have sent and received the Connection header, and sent an
 open frame to our peer, but have not yet received an
 open frame to our peer, but have not yet received an
 open frame.</p></dd>

 <dt>CLOSE-PIPE</dt>
 <dd><p>In this state we have send and received the Connection header, sent an
 open frame, any pipelined Connection traffic, and the
 close frame, but we have not yet received an
 open frame.</p></dd>

 <dt>OPENED</dt>
 <dd><p>In this state the Connection header and the open frame
 have both been sent and received.</p></dd>

 <dt>CLOSE-RCVD</dt>
 <dd><p>In this state we have received a close frame indicating
 that our partner has initiated a close. This means we will never have to read anything
 more from this Connection, however we can continue to write frames onto the Connection.
 If desired, an implementation could do a TCP half-close at this point to shutdown the
 read side of the Connection.</p></dd>

 <dt>CLOSE-SENT</dt>
 <dd><p>In this state we have sent a close frame to our partner.
 It is illegal to write anything more onto the Connection, however there may still be
 incoming frames. If desired, an implementation could do a TCP half-close at this point
 to shutdown the write side of the Connection.</p></dd>

 <dt>DISCARDING</dt>
 <dd><p>The DISCARDING state is a variant of the CLOSE_SENT state where the
 close is triggered by an error. In this case any incoming frames on
 the connection MUST be silently discarded until the peer's close frame
 is received.</p></dd>

 <dt>END</dt>
 <dd><p>In this state it is illegal for either endpoint to write anything more onto the
 Connection. The Connection may be safely closed and discarded.</p></dd>
 </dl>Connection negotiation state diagram from AMQP 1.0 spec:
 <pre>
              R:HDR +=======+ S:HDR             R:HDR[!=S:HDR]
           +--------| START |-----+    +--------------------------------+
           |        +=======+     |    |                                |
          \\|/                    \\|/   |                                |
      +==========+             +==========+ S:OPEN                      |
 +----| HDR-RCVD |             | HDR-SENT |------+                      |
 |    +==========+             +==========+      |      R:HDR[!=S:HDR]  |
 |   S:HDR |                      | R:HDR        |    +-----------------+
 |         +--------+      +------+              |    |                 |
 |                 \\|/    \\|/                   \\|/   |                 |
 |                +==========+               +-----------+ S:CLOSE      |
 |                | HDR-EXCH |               | OPEN-PIPE |----+         |
 |                +==========+               +-----------+    |         |
 |           R:OPEN |      | S:OPEN              | R:HDR      |         |
 |         +--------+      +------+      +-------+            |         |
 |        \\|/                    \\|/    \\|/                  \\|/        |
 |   +===========+             +===========+ S:CLOSE       +---------+  |
 |   | OPEN-RCVD |             | OPEN-SENT |-----+         | OC-PIPE |--+
 |   +===========+             +===========+     |         +---------+  |
 |  S:OPEN |                      | R:OPEN      \\|/           | R:HDR   |
 |         |       +========+     |          +------------+   |         |
 |         +----- >| OPENED |< ---+          | CLOSE-PIPE |< -+         |
 |                 +========+                +------------+             |
 |           R:CLOSE |    | S:CLOSE              | R:OPEN               |
 |         +---------+    +-------+              |                      |
 |        \\|/                    \\|/             |                      |
 |   +============+          +=============+     |                      |
 |   | CLOSE-RCVD |          | CLOSE-SENT* |< ---+                      |
 |   +============+          +=============+                            |
 | S:CLOSE |                      | R:CLOSE                             |
 |         |         +=====+      |                                     |
 |         +------- >| END |< ----+                                     |
 |                   +=====+                                            |
 |                     /|\                                              |
 |    S:HDR[!=R:HDR]    |                R:HDR[!=S:HDR]                 |
 +----------------------+-----------------------------------------------+

 </pre>R:<b>CTRL</b> = Received <b>CTRL</b>S:<b>CTRL</b> = Sent <b>CTRL</b>Also could be DISCARDING if an error condition triggered the CLOSE


| Param | Description |
| --- | --- |
| connectPolicy | ConnectPolicy from a DefaultPolicy implementation |

<a name="Connection+open"></a>
### connection.open(address, sasl)
Open a connection to the given (parsed) address (@see [AMQPClient](#AMQPClient)).

**Kind**: instance method of <code>[Connection](#Connection)</code>  

| Param | Description |
| --- | --- |
| address | Contains at least protocol, host and port, may contain user/pass, path. |
| sasl | If given, contains a "negotiate" method that, given address and a callback, will run through SASL negotiations. |

<a name="Error"></a>
## Error
**Kind**: global class  
<a name="new_Error_new"></a>
### new errors.BaseError()
The base error all amqp10 Errors inherit from.

<a name="AttachFrame"></a>
## AttachFrame
**Kind**: global class  
<a name="new_AttachFrame_new"></a>
### new AttachFrame()
<h2>attach performative</h2><i>attach a Link to a Session</i><p>          The  frame indicates that a Link Endpoint has been          attached to the Session. The opening flag is used to indicate that the Link Endpoint is          newly created.        </p><p>attach</p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:attach:list</dd><dt>Code</dt><dd>0x00000000:0x00000012</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>name</td><td>string</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the name of the link</i><p>            This name uniquely identifies the link from the container of the source to the container            of the target node, e.g. if the container of the source node is A, and the container of            the target node is B, the link may be globally identified by the (ordered) tuple            .          </p></td></tr><tr><td>handle</td><td>handle</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            The handle MUST NOT be used for other open Links. An attempt to attach using a handle            which is already associated with a Link MUST be responded to with an immediate             carrying a Handle-in-use .           </p><p>close</p><p>             To make it easier to monitor AMQP link attach frames, it is recommended that             implementations always assign the lowest available handle to this field.           </p></td></tr><tr><td>role</td><td>role</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>role of the link endpoint</i></td></tr><tr><td>snd-settle-mode</td><td>sender-settle-mode</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>settlement mode for the Sender</i><p>            Determines the settlement policy for deliveries sent at the Sender. When set at the            Receiver this indicates the desired value for the settlement mode at the Sender.  When            set at the Sender this indicates the actual settlement mode in use.          </p></td></tr><tr><td>rcv-settle-mode</td><td>receiver-settle-mode</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the settlement mode of the Receiver</i><p>            Determines the settlement policy for unsettled deliveries received at the Receiver. When            set at the Sender this indicates the desired value for the settlement mode at the            Receiver. When set at the Receiver this indicates the actual settlement mode in use.          </p></td></tr><tr><td>source</td><td>*</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the source for Messages</i><p>            If no source is specified on an outgoing Link, then there is no source currently            attached to the Link. A Link with no source will never produce outgoing Messages.          </p></td></tr><tr><td>target</td><td>*</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the target for Messages</i><p>            If no target is specified on an incoming Link, then there is no target currently            attached to the Link. A Link with no target will never permit incoming Messages.          </p></td></tr><tr><td>unsettled</td><td>map</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>unsettled delivery state</i><p>            This is used to indicate any unsettled delivery states when a suspended link is resumed.            The map is keyed by delivery-tag with values indicating the delivery state. The local            and remote delivery states for a given delivery-tag MUST be compared to resolve any            in-doubt deliveries. If necessary, deliveries MAY be resent, or resumed based on the            outcome of this comparison. See .          </p><p>resuming-deliveries</p><p>            If the local unsettled map is too large to be encoded within a frame of the agreed            maximum frame size then the session may be ended with the frame-size-too-small error            (see ). The endpoint SHOULD make use of the ability to send an            incomplete unsettled map (see below) to avoid sending an error.          </p><p>amqp-error</p><p>            The unsettled map MUST NOT contain null valued keys.          </p><p>            When reattaching (as opposed to resuming), the unsettled map MUST be null.          </p></td></tr><tr><td>incomplete-unsettled</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            If set to true this field indicates that the unsettled map provided is not complete.            When the map is incomplete the recipient of the map cannot take the absence of a            delivery tag from the map as evidence of settlement. On receipt of an incomplete            unsettled map a sending endpoint MUST NOT send any new deliveries (i.e. deliveries where            resume is not set to true) to its partner (and a receiving endpoint which sent an            incomplete unsettled map MUST detach with an error on receiving a transfer which does            not have the resume flag set to true).          </p></td></tr><tr><td>initial-delivery-count</td><td>sequence-no</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            This MUST NOT be null if role is sender, and it is ignored if the role is receiver. See            .          </p><p>flow-control</p></td></tr><tr><td>max-message-size</td><td>ulong</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the maximum message size supported by the link endpoint</i><p>            This field indicates the maximum message size supported by the link endpoint. Any            attempt to deliver a message larger than this results in a message-size-exceeded            . If this field is zero or unset, there is no maximum size            imposed by the link endpoint.          </p><p>link-error</p></td></tr><tr><td>offered-capabilities</td><td>symbol</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the extension capabilities the sender supports</i><p>            A list of commonly defined session capabilities and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/link-capabilities</p></td></tr><tr><td>desired-capabilities</td><td>symbol</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the extension capabilities the sender may use if the receiver supports them</i></td></tr><tr><td>properties</td><td>fields</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>link properties</i><p>            The properties map contains a set of fields intended to indicate information about the            link and its container.          </p><p>            A list of commonly defined link properties and their meanings can be found here:          </p><p>http://www.amqp.org/specification/1.0/link-properties</p></td></tr></table>

<a name="BeginFrame"></a>
## BeginFrame
**Kind**: global class  
<a name="new_BeginFrame_new"></a>
### new BeginFrame()
<h2>begin performative</h2><i>begin a Session on a channel</i><p>          Indicate that a Session has begun on the channel.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:begin:list</dd><dt>Code</dt><dd>0x00000000:0x00000011</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>remote-channel</td><td>ushort</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the remote channel for this Session</i><p>            If a Session is locally initiated, the remote-channel MUST NOT be set. When an endpoint            responds to a remotely initiated Session, the remote-channel MUST be set to the channel            on which the remote Session sent the begin.          </p></td></tr><tr><td>next-outgoing-id</td><td>transfer-number</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the transfer-id of the first transfer id the sender will send</i><p>See .</p><p>session-flow-control</p></td></tr><tr><td>incoming-window</td><td>uint</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the initial incoming-window of the sender</i><p>See .</p><p>session-flow-control</p></td></tr><tr><td>outgoing-window</td><td>uint</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the initial outgoing-window of the sender</i><p>See .</p><p>session-flow-control</p></td></tr><tr><td>handle-max</td><td>handle</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the maximum handle value that may be used on the Session</i><p>            The handle-max value is the highest handle value that may be used on the Session.            A peer MUST NOT attempt to attach a Link using a handle value outside the range that its            partner can handle. A peer that receives a handle outside the supported range MUST close            the Connection with the framing-error error-code.          </p></td></tr><tr><td>offered-capabilities</td><td>symbol</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the extension capabilities the sender supports</i><p>            A list of commonly defined session capabilities and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/session-capabilities</p></td></tr><tr><td>desired-capabilities</td><td>symbol</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the extension capabilities the sender may use if the receiver supports them</i></td></tr><tr><td>properties</td><td>fields</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>session properties</i><p>            The properties map contains a set of fields intended to indicate information about the            session and its container.          </p><p>            A list of commonly defined session properties and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/session-properties</p></td></tr></table>

<a name="CloseFrame"></a>
## CloseFrame
**Kind**: global class  
<a name="new_CloseFrame_new"></a>
### new CloseFrame()
<h2>close performative</h2><i>signal a Connection close</i><p>          Sending a close signals that the sender will not be sending any more frames (or bytes of          any other kind) on the Connection. Orderly shutdown requires that this frame MUST be          written by the sender. It is illegal to send any more frames (or bytes of any other kind)          after sending a close frame.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:close:list</dd><dt>Code</dt><dd>0x00000000:0x00000018</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>error</td><td>error</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>error causing the close</i><p>            If set, this field indicates that the Connection is being closed due to an error            condition. The value of the field should contain details on the cause of the error.          </p></td></tr></table>

<a name="DetachFrame"></a>
## DetachFrame
**Kind**: global class  
<a name="new_DetachFrame_new"></a>
### new DetachFrame()
<h2>detach performative</h2><i>detach the Link Endpoint from the Session</i><p>          Detach the Link Endpoint from the Session. This un-maps the handle and makes it available          for use by other Links.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:detach:list</dd><dt>Code</dt><dd>0x00000000:0x00000016</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>handle</td><td>handle</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the local handle of the link to be detached</i></td></tr><tr><td>closed</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>if true then the sender has closed the link</i><p>See .</p><p>closing-a-link</p></td></tr><tr><td>error</td><td>error</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>error causing the detach</i><p>            If set, this field indicates that the Link is being detached due to an error condition.            The value of the field should contain details on the cause of the error.          </p></td></tr></table>

<a name="DispositionFrame"></a>
## DispositionFrame
**Kind**: global class  
<a name="new_DispositionFrame_new"></a>
### new DispositionFrame()
<h2>disposition performative</h2><i>inform remote peer of delivery state changes</i><p>          The disposition frame is used to inform the remote peer of local changes in the state of          deliveries. The disposition frame may reference deliveries from many different links          associated with a session, although all links MUST have the directionality indicated by          the specified .        </p><p>          Note that it is possible for a disposition sent from sender to receiver to refer to a          delivery which has not yet completed (i.e. a delivery which is spread over multiple          frames and not all frames have yet been sent). The use of such interleaving is          discouraged in favor of carrying the modified state on the next          performative for the delivery.        </p><p>transfer</p><p>          The disposition performative may refer to deliveries on links that are no longer attached.          As long as the links have not been closed or detached with an error then the deliveries          are still "live" and the updated state MUST be applied.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:disposition:list</dd><dt>Code</dt><dd>0x00000000:0x00000015</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>role</td><td>role</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>directionality of disposition</i><p>            The role identifies whether the disposition frame contains information            about  link endpoints or  link endpoints.          </p></td></tr><tr><td>first</td><td>delivery-number</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>lower bound of deliveries</i><p>            Identifies the lower bound of delivery-ids for the deliveries in this set.          </p></td></tr><tr><td>last</td><td>delivery-number</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>upper bound of deliveries</i><p>            Identifies the upper bound of delivery-ids for the deliveries in this set. If not set,            this is taken to be the same as .          </p></td></tr><tr><td>settled</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>indicates deliveries are settled</i><p>            If true, indicates that the referenced deliveries are considered settled by the issuing            endpoint.          </p></td></tr><tr><td>state</td><td>*</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>indicates state of deliveries</i><p>            Communicates the state of all the deliveries referenced by this disposition.          </p></td></tr><tr><td>batchable</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>batchable hint</i><p>            If true, then the issuer is hinting that there is no need for the peer to urgently            communicate the impact of the updated delivery states. This hint may be used to            artificially increase the amount of batching an implementation uses when communicating            delivery states, and thereby save bandwidth.          </p></td></tr></table>

<a name="EndFrame"></a>
## EndFrame
**Kind**: global class  
<a name="new_EndFrame_new"></a>
### new EndFrame()
<h2>end performative</h2><i>end the Session</i><p>Indicates that the Session has ended.</p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:end:list</dd><dt>Code</dt><dd>0x00000000:0x00000017</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>error</td><td>error</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>error causing the end</i><p>            If set, this field indicates that the Session is being ended due to an error condition.            The value of the field should contain details on the cause of the error.          </p></td></tr></table>

<a name="FlowFrame"></a>
## FlowFrame
**Kind**: global class  
<a name="new_FlowFrame_new"></a>
### new FlowFrame()
<h2>flow performative</h2><i>update link state</i><p>Updates the flow state for the specified Link.</p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:flow:list</dd><dt>Code</dt><dd>0x00000000:0x00000013</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>next-incoming-id</td><td>transfer-number</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            Identifies the expected transfer-id of the next incoming  frame.            This value is not set if and only if the sender has not yet received the             frame for the session. See             for more details.          </p><p>transfer</p></td></tr><tr><td>incoming-window</td><td>uint</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            Defines the maximum number of incoming  frames that the endpoint            can currently receive. See  for more            details.          </p><p>transfer</p></td></tr><tr><td>next-outgoing-id</td><td>transfer-number</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            The transfer-id that will be assigned to the next outgoing            frame. See  for more details.          </p><p>transfer</p></td></tr><tr><td>outgoing-window</td><td>uint</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            Defines the maximum number of outgoing  frames that the endpoint            could potentially currently send, if it was not constrained by restrictions imposed by            its peer's incoming-window. See  for more            details.          </p><p>transfer</p></td></tr><tr><td>handle</td><td>handle</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            If set, indicates that the flow frame carries flow state information for the local Link            Endpoint associated with the given handle.  If not set, the flow frame is carrying only            information pertaining to the Session Endpoint.          </p><p>            If set to a handle that is not currently associated with an attached Link, the            recipient MUST respond by ending the session with an  session error.          </p><p>session-error</p></td></tr><tr><td>delivery-count</td><td>sequence-no</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the endpoint's delivery-count</i><p>            When the handle field is not set, this field MUST NOT be set.          </p><p>            When the handle identifies that the flow state is being sent from the Sender Link            Endpoint to Receiver Link Endpoint this field MUST be set to the current delivery-count            of the Link Endpoint.          </p><p>            When the flow state is being sent from the Receiver Endpoint to the Sender Endpoint this            field MUST be set to the last known value of the corresponding Sending Endpoint. In the            event that the Receiving Link Endpoint has not yet  seen the initial             frame from the Sender this field MUST NOT be set.          </p><p>attach</p><p>            See  for more details.          </p><p>flow-control</p></td></tr><tr><td>link-credit</td><td>uint</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the current maximum number of Messages that can be received</i><p>            The current maximum number of Messages that can be handled at the Receiver            Endpoint of the Link. Only the receiver endpoint can independently set this value. The            sender endpoint sets this to the last known value seen from the receiver. See             for more details.          </p><p>flow-control</p><p>            When the handle field is not set, this field MUST NOT be set.          </p></td></tr><tr><td>available</td><td>uint</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the number of available Messages</i><p>            The number of Messages awaiting credit at the link sender endpoint. Only the            sender can independently set this value. The receiver sets this to the last known value            seen from the sender. See  for more details.          </p><p>flow-control</p><p>            When the handle field is not set, this field MUST NOT be set.          </p></td></tr><tr><td>drain</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>indicates drain mode</i><p>            When flow state is sent from the sender to the receiver, this field contains the actual            drain mode of the sender. When flow state is sent from the receiver to the sender, this            field contains the desired drain mode of the receiver. See  for more details.          </p><p>flow-control</p><p>            When the handle field is not set, this field MUST NOT be set.          </p></td></tr><tr><td>echo</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>request link state from other endpoint</i></td></tr><tr><td>properties</td><td>fields</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>link state properties</i><p>            A list of commonly defined link state properties and their meanings can be found here:          </p><p>http://www.amqp.org/specification/1.0/link-state-properties</p></td></tr></table>

<a name="FrameReader"></a>
## FrameReader
**Kind**: global class  
<a name="FrameReader+read"></a>
### frameReader.read(buffer) ⇒ <code>[AMQPFrame](#AMQPFrame)</code>
For now, just process performative headers.

**Kind**: instance method of <code>[FrameReader](#FrameReader)</code>  
**Returns**: <code>[AMQPFrame](#AMQPFrame)</code> - Frame with populated data, undefined if frame is incomplete.  Throws exception on unmatched frame.  
**Todo**

- [ ] Need to process the payloads as well
- [ ] Cope with Non-AMQP frames


| Param | Description |
| --- | --- |
| buffer | Buffer containing the potential frame data. |

<a name="Frame"></a>
## Frame
**Kind**: global class  

* [Frame](#Frame)
  * [new Frame()](#new_Frame_new)
  * [.readPerformative(describedType)](#Frame+readPerformative)

<a name="new_Frame_new"></a>
### new Frame()
Encapsulates all convenience methods required for encoding a frame to put it out on the wire, and decoding anincoming frame.Frames look like:
 <pre>
             +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |-- > Frame Header
      4 |  DOFF  |  TYPE  | &lt;TYPE-SPECIFIC&gt; |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |-- > Extended Header
        .          &lt;TYPE-SPECIFIC&gt;          .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |                                   |  |
        .                                   .  |
        .                                   .  |
        .                                   .  |
        .          &lt;TYPE-SPECIFIC&gt;          .  |-- > Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .                                   .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

 </pre>

<a name="Frame+readPerformative"></a>
### frame.readPerformative(describedType)
Used to populate the frame performative from a DescribedType pulled off the wire.

**Kind**: instance method of <code>[Frame](#Frame)</code>  

| Param | Type | Description |
| --- | --- | --- |
| describedType | <code>[DescribedType](#DescribedType)</code> | Details of the frame performative, should populate internal values. |

<a name="AMQPFrame"></a>
## AMQPFrame
**Kind**: global class  
<a name="new_AMQPFrame_new"></a>
### new AMQPFrame()
AMQP Frames are slight variations on the one above, with the first part of the payload taken upby the AMQP <i>performative</i> (details of the specific frame type).  For some frames, that's the entire payload.
<pre>
      +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |-- > Frame Header
      4 |  DOFF  |  TYPE  |     CHANNEL     |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |-- > Extended Header
        .             &lt;IGNORED&gt;             .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |           PERFORMATIVE:           |  |
        .      Open / Begin / Attach        .  |
        .   Flow / Transfer / Disposition   .  |
        .      Detach / End / Close         .  |
        |-----------------------------------|  |
        .                                   .  |-- > Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .             PAYLOAD               .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

</pre>

<a name="HeartbeatFrame"></a>
## HeartbeatFrame
**Kind**: global class  
<a name="new_HeartbeatFrame_new"></a>
### new HeartbeatFrame()
Heartbeat frames are under-specified in the AMQP Specification as "an empty frame".  In practice, thisseems to be interpreted as a an empty header with a type of 0 (or 0x0000 0008 0200 0000).

<a name="OpenFrame"></a>
## OpenFrame
**Kind**: global class  
<a name="new_OpenFrame_new"></a>
### new OpenFrame()
<h2>open performative</h2><i>negotiate Connection parameters</i><p>          The first frame sent on a connection in either direction MUST contain an Open body. (Note          that the Connection header which is sent first on the Connection is *not* a frame.) The          fields indicate the capabilities and limitations of the sending peer.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:open:list</dd><dt>Code</dt><dd>0x00000000:0x00000010</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>container-id</td><td>string</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the id of the source container</i></td></tr><tr><td>hostname</td><td>string</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the name of the target host</i><p>            The dns name of the host (either fully qualified or relative) to which the sending peer            is connecting. It is not mandatory to provide the hostname. If no hostname is provided            the receiving peer should select a default based on its own configuration. This field            can be used by AMQP proxies to determine the correct back-end service to connect            the client to.          </p><p>            This field may already have been specified by the  frame, if a            SASL layer is used, or, the server name indication extension as described in            RFC-4366, if a TLS layer is used, in which case this field SHOULD be null or contain            the same value. It is undefined what a different value to those already specific means.          </p><p>sasl-init</p></td></tr><tr><td>max-frame-size</td><td>uint</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>proposed maximum frame size</i><p>            The largest frame size that the sending peer is able to accept on this Connection. If            this field is not set it means that the peer does not impose any specific limit. A peer            MUST NOT send frames larger than its partner can handle. A peer that receives an            oversized frame MUST close the Connection with the framing-error error-code.          </p><p>            Both peers MUST accept frames of up to  octets            large.          </p><p>MIN-MAX-FRAME-SIZE</p></td></tr><tr><td>channel-max</td><td>ushort</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the maximum channel number that may be used on the Connection</i><p>            The channel-max value is the highest channel number that may be used on the Connection.            This value plus one is the maximum number of Sessions that can be simultaneously active            on the Connection. A peer MUST not use channel numbers outside the range that its            partner can handle. A peer that receives a channel number outside the supported range            MUST close the Connection with the framing-error error-code.          </p></td></tr><tr><td>idle-time-out</td><td>milliseconds</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>idle time-out</i><p>            The idle time-out required by the sender. A value of zero is the same as if it was            not set (null). If the receiver is unable or unwilling to support the idle time-out            then it should close the connection with an error explaining why (eg, because it is            too small).          </p><p>            If the value is not set, then the sender does not have an idle time-out. However,            senders doing this should be aware that implementations MAY choose to use an            internal default to efficiently manage a peer's resources.          </p></td></tr><tr><td>outgoing-locales</td><td>ietf-language-tag</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>locales available for outgoing text</i><p>            A list of the locales that the peer supports for sending informational text. This            includes Connection, Session and Link error descriptions. A peer MUST support at least            the  locale (see ). Since this value is            always supported, it need not be supplied in the outgoing-locales. A null value or an            empty list implies that only  is supported.          </p><p>ietf-language-tag</p></td></tr><tr><td>incoming-locales</td><td>ietf-language-tag</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>desired locales for incoming text in decreasing level of preference</i><p>            A list of locales that the sending peer permits for incoming informational text. This            list is ordered in decreasing level of preference. The receiving partner will chose the            first (most preferred) incoming locale from those which it supports. If none of the            requested locales are supported,  will be chosen. Note that            need not be supplied in this list as it is always the fallback. A peer may determine            which of the permitted incoming locales is chosen by examining the partner's supported            locales as specified in the outgoing-locales field. A null value or an empty list            implies that only  is supported.          </p></td></tr><tr><td>offered-capabilities</td><td>symbol</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the extension capabilities the sender supports</i><p>            If the receiver of the offered-capabilities requires an extension capability which is            not present in the offered-capability list then it MUST close the connection.          </p><p>            A list of commonly defined connection capabilities and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/connection-capabilities</p></td></tr><tr><td>desired-capabilities</td><td>symbol</td><td>false</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the extension capabilities the sender may use if the receiver supports them</i><p>            The desired-capability list defines which extension capabilities the sender MAY use if            the receiver offers them (i.e. they are in the offered-capabilities list received by the            sender of the desired-capabilities). If the receiver of the desired-capabilities offers            extension capabilities which are not present in the desired-capability list it received,            then it can be sure those (undesired) capabilities will not be used on the            Connection.          </p></td></tr><tr><td>properties</td><td>fields</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>connection properties</i><p>            The properties map contains a set of fields intended to indicate information about the            connection and its container.          </p><p>            A list of commonly defined connection properties and their meanings can be found here:          </p><p>http://www.amqp.org/specification/1.0/connection-properties</p></td></tr></table>

<a name="SaslFrame"></a>
## SaslFrame
**Kind**: global class  
<a name="new_SaslFrame_new"></a>
### new SaslFrame()
Base Frame for SASL authentication.To establish a SASL tunnel, each peer MUST start by sending a protocol header. The protocolheader consists of the upper case ASCII letters "AMQP" followed by a protocol id of three,followed by three unsigned bytes representing the major, minor, and revision of thespecification version (see constants.saslVersion). In total this is an 8-octet sequence:
 <pre>
 4 OCTETS   1 OCTET   1 OCTET   1 OCTET   1 OCTET
 +----------+---------+---------+---------+----------+
 |  "AMQP"  |   %d3   |  major  |  minor  | revision |
 +----------+---------+---------+---------+----------+
 </pre>Other than using a protocol id of three, the exchange of SASL tunnel headers follows thesame rules specified in the version negotiation section of the transport specification (Seeversion-negotiation).The following diagram illustrates the interaction involved in creating a SASL Security Layer:
 <pre>
 TCP Client                 TCP Server
 =========================================
 AMQP%d3.1.0.0  -------- >
 < --------  AMQP%d3.1.0.0
 :
 :
 &lt;SASL negotiation&gt;
 :
 :
 AMQP%d0.1.0.0  -------- >                (over SASL secured connection)
 < --------  AMQP%d0.1.0.0
 open  -------- >
 < --------  open
 </pre>SASL is negotiated using framing. A SASL frame has a type code of 0x01.Bytes 6 and 7 of the header are ignored. Implementations SHOULD set these to 0x00. Theextended header is ignored. Implementations SHOULD therefore set DOFF to 0x02.
 <pre>
 type: 0x01 - SASL frame
 +0       +1       +2       +3
 +-----------------------------------+ -.
 0 |                SIZE               |  |
 +-----------------------------------+  |-- > Frame Header
 4 |  DOFF  |  TYPE  |   &lt;IGNORED&gt;&#42;1   |  |      (8 bytes)
 +-----------------------------------+ -'
 +-----------------------------------+ -.
 8 |                ...                |  |
 .                                   .  |-- > Extended Header
 .             &lt;IGNORED&gt;&#42;2           .  |  (DOFF * 4 - 8) bytes
 |                ...                |  |
 +-----------------------------------+ -'
 +-----------------------------------+ -.
 4*DOFF |                                   |  |
 .    Sasl Mechanisms / Sasl Init    .  |
 .   Sasl Challenge / Sasl Response  .  |-- > Frame Body
 .           Sasl Outcome            .  |  (SIZE - DOFF * 4) bytes
 .                           ________|  |
 |                ...       |           |
 +--------------------------+          -'
 &#42;1 SHOULD be set to 0x0000
 &#42;2 Ignored, so DOFF should be set to 0x02
 </pre>The maximum size of a SASL frame is defined by constants.minMaxFrameSize. There isno mechanism within the SASL negotiation to negotiate a different size. The frame body of aSASL frame may contain exactly one AMQP type, whose type encoding must havesasl-frame. Receipt of an empty frame is an irrecoverable error.

<a name="SaslMechanisms"></a>
## SaslMechanisms
**Kind**: global class  
<a name="new_SaslMechanisms_new"></a>
### new SaslMechanisms(options)
A list of the sasl security mechanisms supported by the sending peer. It is invalidfor this list to be null or empty. If the sending peer does not require its partnerto authenticate with it, then it should send a list of one element with its value asthe SASL mechanism <i>ANONYMOUS</i>. The server mechanisms are ordered in decreasinglevel of preference.


| Param | Description |
| --- | --- |
| options | Either the DescribedType of an incoming SASL Mechanisms frame,                  or an array of mechanisms, or a map with a mechanisms key. |

<a name="SaslInit"></a>
## SaslInit
**Kind**: global class  
<a name="new_SaslInit_new"></a>
### new SaslInit(options)
SASL Init frame, containing the following fields:<table border="1">    <tr><th>Name</th><th>Type</th><th>Mandatory</th><th>Multiple?</th></tr>    <tr><td>mechanism</td><td>symbol</td><td>true</td><td>false</td></tr>    <tr><td>&nbsp;</td><td colspan="3">The name of the SASL mechanism used for the SASL exchange. If the selected mechanism isnot supported by the receiving peer, it MUST close the Connection with theauthentication-failure close-code. Each peer MUST authenticate using the highest-levelsecurity profile it can handle from the list provided by the partner.     </td></tr>     <tr><td>initial-response</td><td>binary</td><td>false</td><td>false</td></tr>     <tr><td>&nbsp;</td><td colspan="3">     <i>security response data</i><br/>     <p>A block of opaque data passed to the security mechanism. The contents of this data aredefined by the SASL security mechanism.     </p>     </td></tr>     <tr><td>hostname</td><td>string</td><td>false</td><td>false</td></tr>     <tr><td>&nbsp;</td><td colspan="3">     <i>the name of the target host</i><br/>     <p>The DNS name of the host (either fully qualified or relative) to which the sending peeris connecting. It is not mandatory to provide the hostname. If no hostname is providedthe receiving peer should select a default based on its own configuration.     </p>     <p>This field can be used by AMQP proxies to determine the correct back-end service toconnect the client to, and to determine the domain to validate the client's credentialsagainst.     </p>     <p>This field may already have been specified by the server name indication extension asdescribed in RFC-4366, if a TLS layer is used, in which case this field SHOULD be nullor contain the same value. It is undefined what a different value to those alreadyspecific means.     </p>     </td></tr></table>


| Param |
| --- |
| options | 

<a name="SaslChallenge"></a>
## SaslChallenge
**Kind**: global class  
<a name="new_SaslChallenge_new"></a>
### new SaslChallenge(options)
SASL Challenge frame, containing the following field:<table border="1">    <tr><th>Name</th><th>Type</th><th>Mandatory</th><th>Multiple?</th></tr>    <tr><td>challenge</td><td>binary</td><td>true</td><td>false</td></tr>    <tr><td>&nbsp;</td><td colspan="3">Challenge information, a block of opaque binary data passed to the securitymechanism.    </td></tr></table>


| Param |
| --- |
| options | 

<a name="SaslResponse"></a>
## SaslResponse
**Kind**: global class  
<a name="new_SaslResponse_new"></a>
### new SaslResponse(options)
SASL Response frame, containing the following field:<table border="1">    <tr><th>Name</th><th>Type</th><th>Mandatory</th><th>Multiple?</th></tr>    <tr><td>response</td><td>binary</td><td>true</td><td>false</td></tr>    <tr><td>&nbsp;</td><td colspan="3">A block of opaque data passed to the security mechanism. The contents of this data aredefined by the SASL security mechanism.    </td></tr></table>


| Param |
| --- |
| options | 

<a name="SaslOutcome"></a>
## SaslOutcome
**Kind**: global class  
<a name="new_SaslOutcome_new"></a>
### new SaslOutcome(options)
This frame indicates the outcome of the SASL dialog. Upon successful completion of theSASL dialog the Security Layer has been established, and the peers must exchange protocolheaders to either start a nested Security Layer, or to establish the AMQP Connection.SASL Outcome frame contains the following fields:<table border="1">    <tr><th>Name</th><th>Type</th><th>Mandatory</th><th>Multiple?</th></tr>    <tr><td>code</td><td>sasl-code</td><td>true</td><td>false</td></tr>    <tr><td>&nbsp;</td><td colspan="3">    <i>indicates the outcome of the sasl dialog</i><br/>    </td></tr>    <tr><td>additional-data</td><td>binary</td><td>false</td><td>false</td></tr>    <tr><td>&nbsp;</td><td colspan="3">The additional-data field carries additional data on successful authentication outcomeas specified by the SASL specification (RFC-4422). If the authentication isunsuccessful, this field is not set.    </td></tr></table>SASL Code is a ubyte constrained to the following:<table border="1">    <tr><th>Byte</th><th>Name</th><th>Details</th></tr>    <tr><td>0</td><td>ok</td><td>Connection authentication succeeded.</td></tr>    <tr><td>1</td><td>auth</td><td>Connection authentication failed due to an unspecified problem with the suppliedcredentials.    </td></tr>    <tr><td>2</td><td>sys</td><td>Connection authentication failed due to a system error.    </td></tr>    <tr><td>3</td><td>sys-perm</td><td>Connection authentication failed due to a system error that is unlikely to be correctedwithout intervention.    </td></tr>    <tr><td>4</td><td>sys-temp</td><td>Connection authentication failed due to a transient system error.    </td></tr></table>


| Param |
| --- |
| options | 

<a name="TransferFrame"></a>
## TransferFrame
**Kind**: global class  
<a name="new_TransferFrame_new"></a>
### new TransferFrame()
<h2>transfer performative</h2><i>transfer a Message</i><p>          The transfer frame is used to send Messages across a Link. Messages may be carried by a          single transfer up to the maximum negotiated frame size for the Connection. Larger          Messages may be split across several transfer frames.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:transfer:list</dd><dt>Code</dt><dd>0x00000000:0x00000014</dd></dl><table border="1"><tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>handle</td><td>handle</td><td>true</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>Specifies the Link on which the Message is transferred.</p></td></tr><tr><td>delivery-id</td><td>delivery-number</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>alias for delivery-tag</i><p>            The delivery-id MUST be supplied on the first transfer of a multi-transfer delivery. On            continuation transfers the delivery-id MAY be omitted. It is an error if the delivery-id            on a continuation transfer differs from the delivery-id on the first transfer of a            delivery.          </p></td></tr><tr><td>delivery-tag</td><td>delivery-tag</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            Uniquely identifies the delivery attempt for a given Message on this Link. This field            MUST be specified for the first transfer of a multi transfer message and may only be            omitted for continuation transfers.          </p></td></tr><tr><td>message-format</td><td>message-format</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>indicates the message format</i><p>            This field MUST be specified for the first transfer of a multi transfer message and may            only be omitted for continuation transfers.          </p></td></tr><tr><td>settled</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>             If not set on the first (or only) transfer for a delivery, then the settled flag MUST             be interpreted as being false. For subsequent transfers if the settled flag is left             unset then it MUST be interpreted as true if and only if the value of the settled flag             on any of the preceding transfers was true; if no preceding transfer was sent with             settled being true then the value when unset MUST be taken as false.          </p><p>             If the negotiated value for snd-settle-mode at attachment is , then this field MUST be true on at least             one transfer frame for a delivery (i.e. the delivery must be settled at the Sender at             the point the delivery has been completely transferred).          </p><p>sender-settle-mode</p><p>             If the negotiated value for snd-settle-mode at attachment is , then this field MUST be false (or             unset) on every transfer frame for a delivery (unless the delivery is aborted).          </p><p>sender-settle-mode</p></td></tr><tr><td>more</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>indicates that the Message has more content</i><p>            Note that if both the more and aborted fields are set to true, the aborted flag takes            precedence. That is a receiver should ignore the value of the more field if the            transfer is marked as aborted. A sender SHOULD NOT set the more flag to true if it            also sets the aborted flag to true.          </p></td></tr><tr><td>rcv-settle-mode</td><td>receiver-settle-mode</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3">undefined<p>            If , this indicates that the            Receiver MUST settle the delivery once it has arrived without waiting for the Sender to            settle first.          </p><p>receiver-settle-mode</p><p>            If , this indicates that the            Receiver MUST NOT settle until sending its disposition to the Sender and receiving a            settled disposition from the sender.          </p><p>receiver-settle-mode</p><p>            If not set, this value is defaulted to the value negotiated on link attach.          </p><p>            If the negotiated link value is ,            then it is illegal to set this field to .          </p><p>receiver-settle-mode</p><p>            If the message is being sent settled by the Sender, the value of this field is ignored.          </p><p>            The (implicit or explicit) value of this field does not form part of the transfer state,            and is not retained if a link is suspended and subsequently resumed.          </p></td></tr><tr><td>state</td><td>*</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>the state of the delivery at the sender</i><p>            When set this informs the receiver of the state of the delivery at the sender. This is            particularly useful when transfers of unsettled deliveries are resumed after a resuming            a link. Setting the state on the transfer can be thought of as being equivalent to            sending a disposition immediately before the  performative, i.e.            it is the state of the delivery (not the transfer) that existed at the point the frame            was sent.          </p><p>transfer</p><p>            Note that if the  performative (or an earlier  performative referring to the delivery) indicates that the delivery            has attained a terminal state, then no future  or  sent by the sender can alter that terminal state.          </p><p>transfer</p></td></tr><tr><td>resume</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>indicates a resumed delivery</i><p>            If true, the resume flag indicates that the transfer is being used to reassociate an            unsettled delivery from a dissociated link endpoint. See             for more details.          </p><p>resuming-deliveries</p><p>            The receiver MUST ignore resumed deliveries that are not in its local unsettled map. The            sender MUST NOT send resumed transfers for deliveries not in its local unsettled map.          </p><p>            If a resumed delivery spans more than one transfer performative, then the resume flag            MUST be set to true on the first transfer of the resumed delivery.  For subsequent            transfers for the same delivery the resume flag may be set to true, or may be omitted.          </p><p>            In the case where the exchange of unsettled maps makes clear that all message data has            been successfully transferred to the receiver, and that only the final state (and            potentially settlement) at the sender needs to be conveyed, then a resumed delivery may            carry no payload and instead act solely as a vehicle for carrying the terminal state of            the delivery at the sender.           </p></td></tr><tr><td>aborted</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>indicates that the Message is aborted</i><p>            Aborted Messages should be discarded by the recipient (any payload within the frame            carrying the performative MUST be ignored). An aborted Message is implicitly settled.          </p></td></tr><tr><td>batchable</td><td>boolean</td><td>false</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="3"><i>batchable hint</i><p>            If true, then the issuer is hinting that there is no need for the peer to urgently            communicate updated delivery state. This hint may be used to artificially increase the            amount of batching an implementation uses when communicating delivery states, and            thereby save bandwidth.          </p><p>            If the message being delivered is too large to fit within a single frame, then the            setting of batchable to true on any of the  performatives for the            delivery is equivalent to setting batchable to true for all the            performatives for the delivery.          </p><p>transfer</p><p>            The batchable value does not form part of the transfer state, and is not retained if            a link is suspended and subsequently resumed.          </p></td></tr></table>

<a name="Sasl"></a>
## Sasl
**Kind**: global class  
<a name="new_Sasl_new"></a>
### new Sasl()
Currently, only supports SASL-PLAIN

<a name="Session"></a>
## Session
**Kind**: global class  

* [Session](#Session)
  * [new Session(conn)](#new_Session_new)
  * [._resetLinkState()](#Session+_resetLinkState)

<a name="new_Session_new"></a>
### new Session(conn)
A Session is a bidirectional sequential conversation between two containers that provides agrouping for related links. Sessions serve as the context for link communication. Any numberof links of any directionality can be <i>attached</i> to a given Session. However, a linkmay be attached to at most one Session at a time.Session states, from AMQP 1.0 spec:
 <dl>
 <dt>UNMAPPED</dt>
 <dd><p>In the UNMAPPED state, the Session endpoint is not mapped to any incoming or outgoing
 channels on the Connection endpoint. In this state an endpoint cannot send or receive
 frames.</p></dd>

 <dt>BEGIN-SENT</dt>
 <dd><p>In the BEGIN-SENT state, the Session endpoint is assigned an outgoing channel number,
 but there is no entry in the incoming channel map. In this state the endpoint may send
 frames but cannot receive them.</p></dd>

 <dt>BEGIN-RCVD</dt>
 <dd><p>In the BEGIN-RCVD state, the Session endpoint has an entry in the incoming channel
 map, but has not yet been assigned an outgoing channel number. The endpoint may receive
 frames, but cannot send them.</p></dd>

 <dt>MAPPED</dt>
 <dd><p>In the MAPPED state, the Session endpoint has both an outgoing channel number and an
 entry in the incoming channel map. The endpoint may both send and receive
 frames.</p></dd>

 <dt>END-SENT</dt>
 <dd><p>In the END-SENT state, the Session endpoint has an entry in the incoming channel map,
 but is no longer assigned an outgoing channel number. The endpoint may receive frames,
 but cannot send them.</p></dd>

 <dt>END-RCVD</dt>
 <dd><p>In the END-RCVD state, the Session endpoint is assigned an outgoing channel number,
 but there is no entry in the incoming channel map. The endpoint may send frames, but
 cannot receive them.</p></dd>

 <dt>DISCARDING</dt>
 <dd><p>The DISCARDING state is a variant of the END-SENT state where the <code>end</code>
 is triggered by an error. In this case any incoming frames on the session MUST be
 silently discarded until the peer's <code>end</code> frame is received.</p></dd>
 </dl>

 <pre>
                         UNMAPPED< ------------------+
                            |                        |
                    +-------+-------+                |
            S:BEGIN |               | R:BEGIN        |
                    |               |                |
                   \\|/             \\|/               |
                BEGIN-SENT      BEGIN-RCVD           |
                    |               |                |
                    |               |                |
            R:BEGIN |               | S:BEGIN        |
                    +-------+-------+                |
                            |                        |
                           \\|/                       |
                          MAPPED                     |
                            |                        |
              +-------------+-------------+          |
 S:END(error) |       S:END |             | R:END    |
              |             |             |          |
             \\|/           \\|/           \\|/         |
          DISCARDING     END-SENT      END-RCVD      |
              |             |             |          |
              |             |             |          |
        R:END |       R:END |             | S:END    |
              +-------------+-------------+          |
                            |                        |
                            |                        |
                            +------------------------+
  </pre>There is no obligation to retain a Session Endpoint when it is in the UNMAPPED state, i.e.the UNMAPPED state is equivalent to a NONEXISTENT state.Note: This implementation *assumes* it is the client, and thus will always be the one BEGIN-ing a Session.


| Param | Type | Description |
| --- | --- | --- |
| conn | <code>[Connection](#Connection)</code> | Connection to bind session to. |

<a name="Session+_resetLinkState"></a>
### session._resetLinkState()
INTERNALResets the state of all known links for this session.

**Kind**: instance method of <code>[Session](#Session)</code>  
<a name="Types"></a>
## Types
**Kind**: global class  
<a name="new_Types_new"></a>
### new Types()
Type definitions, encoders, and decoders - used extensively by [Codec](#Codec).

<a name="AMQPArray"></a>
## AMQPArray
**Kind**: global class  
<a name="new_AMQPArray_new"></a>
### new AMQPArray(arr, elementType)
Encoding for AMQP Arrays - homogeneous typed collections.  Provides the CODE for the element type.


| Param | Type | Description |
| --- | --- | --- |
| arr | <code>Array</code> | Array contents, should be encode-able to the given code type. |
| elementType | <code>Number</code> | BYTE code-point for the array values (e.g. 0xA1). |

<a name="AMQPSymbol"></a>
## AMQPSymbol
**Kind**: global class  
<a name="new_AMQPSymbol_new"></a>
### new AMQPSymbol(str)
Encoding for AMQP Symbol type, to differentiate from strings.  More terse than ForcedType.


| Param | Type | Description |
| --- | --- | --- |
| str | <code>String</code> | Symbol contents |

<a name="DescribedType"></a>
## DescribedType
**Kind**: global class  
<a name="new_DescribedType_new"></a>
### new DescribedType(descriptorOrType, value)
Described type, as described in the AMQP 1.0 spec as follows:
<pre>
             constructor                       untyped bytes
                  |                                 |
      +-----------+-----------+   +-----------------+-----------------+
      |                       |   |                                   |
 ...  0x00 0xA1 0x03 "URL" 0xA1   0x1E "http://example.org/hello-world"  ...
           |             |  |     |                                   |
           +------+------+  |     |                                   |
                  |         |     |                                   |
             descriptor     |     +------------------+----------------+
                            |                        |
                            |         string value encoded according
                            |             to the str8-utf8 encoding
                            |
                 primitive format code
               for the str8-utf8 encoding

</pre>(Note: this example shows a string-typed descriptor, which should be considered reserved)


| Param | Description |
| --- | --- |
| descriptorOrType | Descriptor for the type (can be any valid AMQP type, including another described type), or the type itself. |
| value | Value of the described type (can also be any valid AMQP type, including another described type). |

<a name="ForcedType"></a>
## ForcedType
**Kind**: global class  
<a name="new_ForcedType_new"></a>
### new ForcedType(typeName, value)
ForcedType coerces the encoder to encode to the given type, regardless of what it might think.


| Param | Description |
| --- | --- |
| typeName | Symbolic name or specific code (e.g. 'long', or 0xA0) |
| value | Value to encode, should be compatible or bad things will occur |

<a name="Header"></a>
## Header
**Kind**: global class  
<a name="new_Header_new"></a>
### new Header(options)

| Param |
| --- |
| options | 

<a name="DeliveryAnnotations"></a>
## DeliveryAnnotations
**Kind**: global class  
<a name="new_DeliveryAnnotations_new"></a>
### new DeliveryAnnotations(annotations)

| Param |
| --- |
| annotations | 

<a name="Annotations"></a>
## Annotations
**Kind**: global class  
<a name="new_Annotations_new"></a>
### new Annotations(annotations)

| Param |
| --- |
| annotations | 

<a name="Properties"></a>
## Properties
**Kind**: global class  
<a name="new_Properties_new"></a>
### new Properties(options)

| Param |
| --- |
| options | 

<a name="ApplicationProperties"></a>
## ApplicationProperties
**Kind**: global class  
<a name="new_ApplicationProperties_new"></a>
### new ApplicationProperties(properties)

| Param |
| --- |
| properties | 

<a name="Footer"></a>
## Footer
**Kind**: global class  
<a name="new_Footer_new"></a>
### new Footer(map)

| Param |
| --- |
| map | 

<a name="Data"></a>
## Data
**Kind**: global class  
<a name="new_Data_new"></a>
### new Data(data)

| Param |
| --- |
| data | 

<a name="AMQPSequence"></a>
## AMQPSequence
**Kind**: global class  
<a name="new_AMQPSequence_new"></a>
### new AMQPSequence(values)

| Param |
| --- |
| values | 

<a name="AMQPValue"></a>
## AMQPValue
**Kind**: global class  
<a name="new_AMQPValue_new"></a>
### new AMQPValue(value)

| Param |
| --- |
| value | 

<a name="Message"></a>
## Message
**Kind**: global class  
<a name="new_Message_new"></a>
### new Message(contents, body)
Actual AMQP Message, which as defined by the spec looks like:
 <pre>
                                                      Bare Message
                                                            |
                                      .---------------------+--------------------.
                                      |                                          |
 +--------+-------------+-------------+------------+--------------+--------------+--------+
 | header | delivery-   | message-    | properties | application- | application- | footer |
 |        | annotations | annotations |            | properties   | data         |        |
 +--------+-------------+-------------+------------+--------------+--------------+--------+
 |                                                                                        |
 '-------------------------------------------+--------------------------------------------'
                                             |
                                      Annotated Message
 </pre>The message _may_ contain the sections above, and application data _may_ be repeated, as follows:* Zero or one [Header](#Header) sections.* Zero or one [DeliveryAnnotations](#DeliveryAnnotations) sections.* Zero or one [Annotations](#Annotations) sections.* Zero or one [Properties](#Properties) sections.* Zero or one [ApplicationProperties](#ApplicationProperties) sections.* The body consists of either: one or more [Data](#Data) sections, one or more [AMQPSequence](#AMQPSequence) sections,     or a single [AMQPValue](#AMQPValue) section.* Zero or one [Footer](#Footer) sections.


| Param |
| --- |
| contents | 
| body | 

<a name="connect"></a>
## connect(url) ⇒ <code>Promise</code>
Connects to a given AMQP server endpoint. Sets the default queue, so e.g.
amqp://my-activemq-host/my-queue-name would set the default queue to
my-queue-name for future send/receive calls.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | URI to connect to - right now only supports <code>amqp|amqps</code> as protocol. |

<a name="createSender"></a>
## createSender(address, [policyOverrides]) ⇒ <code>Promise</code>
Creates a sender link for the given address, with optional link policy

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>String</code> | An address to connect this link to. If not provided will use default queue from connection uri. |
| [policyOverrides] | <code>Object</code> | Policy overrides used for creating this sender link |
| [policyOverrides.name] | <code>String</code> | Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name] |

<a name="createReceiver"></a>
## createReceiver(address, [policyOverrides]) ⇒ <code>Promise</code>
Creates a receiver link for the given address, with optional link policy. The
promise returned resolves to a link that is an EventEmitter, which can be
used to listen for 'message' events.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>String</code> | An address to connect this link to.  If not provided will use default queue from connection uri. |
| [policyOverrides] | <code>Object</code> | Policy overrides used for creating this receiver link |
| [policyOverrides.name] | <code>String</code> | Explicitly set a name for this link, this is an alias to [policyOverrides.attach.name] |

<a name="disconnect"></a>
## disconnect() ⇒ <code>Promise</code>
Disconnect tears down any existing connection with appropriate Close
performatives and TCP socket teardowns.

**Kind**: global function  
<a name="send"></a>
## send(msg, [options]) ⇒ <code>Promise</code>
Sends the given message, with the given options on this link

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>\*</code> | Message to send.  Will be encoded using sender link policy's encoder. |
| [options] | <code>\*</code> | An object of options to attach to the message including: annotations, properties,                                 and application properties |
| options.annotations |  | Annotations for the message, if any.  See AMQP spec for details, and server for specific                               annotations that might be relevant (e.g. x-opt-partition-key on EventHub).  If node-amqp-encoder'd                               map is given, it will be translated to appropriate internal types.  Simple maps will be converted                               to AMQP Fields type as defined in the spec. |

<a name="encoder"></a>
## encoder(val, buf, [codec])
Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint willencode to the fixed-zero-value, the short uint, or the full uint as appropriate).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| val |  | Value to encode (for fixed value encoders (e.g. null) this will be ignored) |
| buf | <code>builder</code> | Buffer-builder into which to write code and encoded value |
| [codec] | <code>[Codec](#Codec)</code> | If needed, the codec to encode other values (e.g. for lists/arrays) |

<a name="decoder"></a>
## decoder(buf, [codec]) ⇒
Decoder methods decode an incoming buffer into an appropriate concrete JS entity.

**Kind**: global function  
**Returns**: Decoded value  

| Param | Type | Description |
| --- | --- | --- |
| buf | <code>Buffer</code> | Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped) |
| [codec] | <code>[Codec](#Codec)</code> | If needed, the codec to decode sub-values for composite types. |

<a name="DeliveryState"></a>
## DeliveryState()
Delivery state base class

**Kind**: global function  
<a name="Received"></a>
## Received(sectionNumber, sectionOffset)
ReceivedThe received outcome

**Kind**: global function  

| Param |
| --- |
| sectionNumber | 
| sectionOffset | 

<a name="Accepted"></a>
## Accepted()
AcceptedThe accepted state

**Kind**: global function  
<a name="Rejected"></a>
## Rejected(error)
RejectThe rejected state

**Kind**: global function  

| Param |
| --- |
| error | 

<a name="Released"></a>
## Released()
ReleasedThe released outcome.

**Kind**: global function  
<a name="Modified"></a>
## Modified(deliveryFailed, undeliverableHere, messageAnnotations)
ModifiedThe modified outcome

**Kind**: global function  

| Param |
| --- |
| deliveryFailed | 
| undeliverableHere | 
| messageAnnotations | 

<a name="encode"></a>
## encode(val)
Encodes given value into node-amqp-encoder format.

**Kind**: global function  

| Param |
| --- |
| val | 

<a name="onUndef"></a>
## onUndef(arg1, arg2) ⇒
Simple, *light-weight* function for coalescing an argument with a default.Differs from _??_ by operating *only* on undefined, and not on null/zero/empty-string/emtpy-array/etc.Could use _args_ and slice and work for arbitrary length argument list, but that would no longer be simple.

**Kind**: global function  
**Returns**: arg2 if arg1 === undefined, otherwise arg1  

| Param |
| --- |
| arg1 | 
| arg2 | 

<a name="assertArguments"></a>
## assertArguments(options, argnames)
Convenience method to assert that a given options object contains the required arguments.

**Kind**: global function  

| Param |
| --- |
| options | 
| argnames | 

