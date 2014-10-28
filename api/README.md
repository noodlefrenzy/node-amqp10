#Index

**Classes**

* [class: CircularBuffer](#CircularBuffer)
  * [new CircularBuffer(initialSize)](#new_CircularBuffer)
* [class: Codec](#Codec)
  * [new Codec()](#new_Codec)
  * [codec._isInteger(n)](#Codec#_isInteger)
  * [codec._readFullValue(buf, [offset], [doNotConsume])](#Codec#_readFullValue)
  * [codec.decode(buf, [offset])](#Codec#decode)
  * [codec.encode(val, buf, [forceType])](#Codec#encode)
* [class: Connection](#Connection)
  * [new Connection()](#new_Connection)
* [class: DescribedType](#DescribedType)
  * [new DescribedType(descriptor, value)](#new_DescribedType)
* [class: AttachFrame](#AttachFrame)
  * [new AttachFrame()](#new_AttachFrame)
* [class: BeginFrame](#BeginFrame)
  * [new BeginFrame()](#new_BeginFrame)
* [class: CloseFrame](#CloseFrame)
  * [new CloseFrame()](#new_CloseFrame)
* [class: DetachFrame](#DetachFrame)
  * [new DetachFrame()](#new_DetachFrame)
* [class: DispositionFrame](#DispositionFrame)
  * [new DispositionFrame()](#new_DispositionFrame)
* [class: EndFrame](#EndFrame)
  * [new EndFrame()](#new_EndFrame)
* [class: FlowFrame](#FlowFrame)
  * [new FlowFrame()](#new_FlowFrame)
* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame._buildOutgoing()](#Frame#_buildOutgoing)
  * [frame.readPerformative(describedType)](#Frame#readPerformative)
* [class: AMQPFrame](#AMQPFrame)
  * [new AMQPFrame()](#new_AMQPFrame)
  * [aMQPFrame.outgoing()](#AMQPFrame#outgoing)
  * [aMQPFrame._getPerformative()](#AMQPFrame#_getPerformative)
  * [aMQPFrame._getAdditionalPayload()](#AMQPFrame#_getAdditionalPayload)
* [class: OpenFrame](#OpenFrame)
  * [new OpenFrame()](#new_OpenFrame)
* [class: TransferFrame](#TransferFrame)
  * [new TransferFrame()](#new_TransferFrame)
* [class: Types](#Types)
  * [new Types()](#new_Types)
  * [types._listBuilder()](#Types#_listBuilder)
  * [types._initTypesArray()](#Types#_initTypesArray)
  * [types._initEncodersDecoders()](#Types#_initEncodersDecoders)

**Functions**

* [encoder(val, buf, [codec])](#encoder)
* [decoder(buf, [codec])](#decoder)
 
<a name="CircularBuffer"></a>
#class: CircularBuffer
**Members**

* [class: CircularBuffer](#CircularBuffer)
  * [new CircularBuffer(initialSize)](#new_CircularBuffer)

<a name="new_CircularBuffer"></a>
##new CircularBuffer(initialSize)
Started this before I found cbarrick's version.  Keeping it around in case his doesn't work out.

**Params**

- initialSize   

<a name="Codec"></a>
#class: Codec
**Members**

* [class: Codec](#Codec)
  * [new Codec()](#new_Codec)
  * [codec._isInteger(n)](#Codec#_isInteger)
  * [codec._readFullValue(buf, [offset], [doNotConsume])](#Codec#_readFullValue)
  * [codec.decode(buf, [offset])](#Codec#decode)
  * [codec.encode(val, buf, [forceType])](#Codec#encode)

<a name="new_Codec"></a>
##new Codec()
Build a codec.

<a name="Codec#_isInteger"></a>
##codec._isInteger(n)
Acquired from http://stackoverflow.com/questions/3885817/how-to-check-if-a-number-is-float-or-integer

**Params**

- n `number` - Number to test.  

**Returns**: `boolean` - True if integral.  
**Access**: private  
<a name="Codec#_readFullValue"></a>
##codec._readFullValue(buf, [offset], [doNotConsume])
Reads a full value's worth of bytes from a circular or regular buffer, or returns undefined if not enough bytes are there.Note that for Buffers, the returned Buffer will be a slice (so backed by the original storage)!

**Params**

- buf `Buffer` | `CBuffer` - Buffer or circular buffer to read from.  If a Buffer is given, it is assumed to be full.  
- \[offset=0\] `integer` - Offset - only valid for Buffer, not CBuffer.  
- \[doNotConsume=false\] `boolean` - If set to true, will peek bytes instead of reading them - useful for leaving                                         circular buffer in original state for described values that are not yet complete.  

**Returns**: `Array` - Buffer of full value + number of bytes read.                                         For described types, will return [ [ descriptor-buffer, value-buffer ], total-bytes ].  
**Access**: private  
<a name="Codec#decode"></a>
##codec.decode(buf, [offset])
Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.

**Params**

- buf `Buffer` | `CBuffer` - The buffer/circular buffer to decode.  Will decode a single value per call.  
- \[offset=0\] `integer` - The offset to read from (only used for Buffers).  

**Returns**: `Array` - Single decoded value + number of bytes consumed.  
<a name="Codec#encode"></a>
##codec.encode(val, buf, [forceType])
Encode the given value as an AMQP 1.0 bitstring.We do a best-effort to determine type.  Objects will be encoded as <code>maps</code>, unless:+ They are DescribedTypes, in which case they will be encoded as such.+ They contain an encodeOrdering array, in which case they will be encoded as a <code>list</code> of their values  in the specified order.+ They are Int64s, in which case they will be encoded as <code>longs</code>.

**Params**

- val  - Value to encode.  
- buf `builder` - buffer-builder to write into.  
- \[forceType\] `string` - If set, forces the encoder for the given type.  

<a name="Connection"></a>
#class: Connection
**Members**

* [class: Connection](#Connection)
  * [new Connection()](#new_Connection)

<a name="new_Connection"></a>
##new Connection()
Connection states, from AMQP 1.0 spec:
 <dl>
 <dt>START</dt>
 <dd><p>In this state a Connection exists, but nothing has been sent or received. This is the
 state an implementation would be in immediately after performing a socket connect or
 socket accept.</p></dd>

 <dt>HDR_RCVD</dt>
 <dd><p>In this state the Connection header has been received from our peer, but we have not
 yet sent anything.</p></dd>

 <dt>HDR_SENT</dt>
 <dd><p>In this state the Connection header has been sent to our peer, but we have not yet
 received anything.</p></dd>

 <dt>OPEN_PIPE</dt>
 <dd><p>In this state we have sent both the Connection header and the open frame, but we have not yet received anything.
 </p></dd>

 <dt>OC_PIPE</dt>
 <dd><p>In this state we have sent the Connection header, the open
 frame, any pipelined Connection traffic, and the close frame,
 but we have not yet received anything.</p></dd>

 <dt>OPEN_RCVD</dt>
 <dd><p>In this state we have sent and received the Connection header, and received an
 open frame from our peer, but have not yet sent an
 open frame.</p></dd>

 <dt>OPEN_SENT</dt>
 <dd><p>In this state we have sent and received the Connection header, and sent an
 open frame to our peer, but have not yet received an
 open frame.</p></dd>

 <dt>CLOSE_PIPE</dt>
 <dd><p>In this state we have send and received the Connection header, sent an
 open frame, any pipelined Connection traffic, and the
 close frame, but we have not yet received an
 open frame.</p></dd>

 <dt>OPENED</dt>
 <dd><p>In this state the Connection header and the open frame
 have both been sent and received.</p></dd>

 <dt>CLOSE_RCVD</dt>
 <dd><p>In this state we have received a close frame indicating
 that our partner has initiated a close. This means we will never have to read anything
 more from this Connection, however we can continue to write frames onto the Connection.
 If desired, an implementation could do a TCP half-close at this point to shutdown the
 read side of the Connection.</p></dd>

 <dt>CLOSE_SENT</dt>
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
 </dl>Connection negotiation state diagram from AMQP 1.0 spec:<pre>
              R:HDR +=======+ S:HDR             R:HDR[!=S:HDR]
           +--------| START |-----+    +--------------------------------+
           |        +=======+     |    |                                |
          \|/                    \|/   |                                |
      +==========+             +==========+ S:OPEN                      |
 +----| HDR_RCVD |             | HDR_SENT |------+                      |
 |    +==========+             +==========+      |      R:HDR[!=S:HDR]  |
 |   S:HDR |                      | R:HDR        |    +-----------------+
 |         +--------+      +------+              |    |                 |
 |                 \|/    \|/                   \|/   |                 |
 |                +==========+               +-----------+ S:CLOSE      |
 |                | HDR_EXCH |               | OPEN_PIPE |----+         |
 |                +==========+               +-----------+    |         |
 |           R:OPEN |      | S:OPEN              | R:HDR      |         |
 |         +--------+      +------+      +-------+            |         |
 |        \|/                    \|/    \|/                  \|/        |
 |   +===========+             +===========+ S:CLOSE       +---------+  |
 |   | OPEN_RCVD |             | OPEN_SENT |-----+         | OC_PIPE |--+
 |   +===========+             +===========+     |         +---------+  |
 |  S:OPEN |                      | R:OPEN      \|/           | R:HDR   |
 |         |       +========+     |          +------------+   |         |
 |         +------>| OPENED |<----+          | CLOSE_PIPE |<--+         |
 |                 +========+                +------------+             |
 |           R:CLOSE |    | S:CLOSE              | R:OPEN               |
 |         +---------+    +-------+              |                      |
 |        \|/                    \|/             |                      |
 |   +============+          +=============+     |                      |
 |   | CLOSE_RCVD |          | CLOSE_SENT* |<----+                      |
 |   +============+          +=============+                            |
 | S:CLOSE |                      | R:CLOSE                             |
 |         |         +=====+      |                                     |
 |         +-------->| END |<-----+                                     |
 |                   +=====+                                            |
 |                     /|\                                              |
 |    S:HDR[!=R:HDR]    |                R:HDR[!=S:HDR]                 |
 +----------------------+-----------------------------------------------+

 </pre> R:<b>CTRL</b> = Received <b>CTRL</b> S:<b>CTRL</b> = Sent <b>CTRL</b> Also could be DISCARDING if an error condition triggered the CLOSE

<a name="DescribedType"></a>
#class: DescribedType
**Members**

* [class: DescribedType](#DescribedType)
  * [new DescribedType(descriptor, value)](#new_DescribedType)

<a name="new_DescribedType"></a>
##new DescribedType(descriptor, value)
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
             |           to the str8-utf8 encoding
             |
     primitive format code
   for the str8-utf8 encoding

</pre> (Note: this example shows a string-typed descriptor, which should be  considered reserved)

**Params**

- descriptor  - Descriptor for the type (can be any valid AMQP type, including another described type).  
- value  - Value of the described type (can also be any valid AMQP type, including another described type).  

<a name="AttachFrame"></a>
#class: AttachFrame
**Members**

* [class: AttachFrame](#AttachFrame)
  * [new AttachFrame()](#new_AttachFrame)

<a name="new_AttachFrame"></a>
##new AttachFrame()
<h2>attach performative</h2><i>attach a Link to a Session</i><p>          The  frame indicates that a Link Endpoint has been          attached to the Session. The opening flag is used to indicate that the Link Endpoint is          newly created.        </p><p>attach</p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:attach:list</dd><dt>Code</dt><dd>0x00000000:0x00000012</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>name</td><td>string</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the name of the link</i><p>            This name uniquely identifies the link from the container of the source to the container            of the target node, e.g. if the container of the source node is A, and the container of            the target node is B, the link may be globally identified by the (ordered) tuple            .          </p></td></tr><tr><td>handle</td><td>handle</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            The handle MUST NOT be used for other open Links. An attempt to attach using a handle            which is already associated with a Link MUST be responded to with an immediate             carrying a Handle-in-use .           </p><p>close</p><p>             To make it easier to monitor AMQP link attach frames, it is recommended that             implementations always assign the lowest available handle to this field.           </p></td></tr><tr><td>role</td><td>role</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>role of the link endpoint</i></td></tr><tr><td>snd-settle-mode</td><td>sender-settle-mode</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>settlement mode for the Sender</i><p>            Determines the settlement policy for deliveries sent at the Sender. When set at the            Receiver this indicates the desired value for the settlement mode at the Sender.  When            set at the Sender this indicates the actual settlement mode in use.          </p></td></tr><tr><td>rcv-settle-mode</td><td>receiver-settle-mode</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the settlement mode of the Receiver</i><p>            Determines the settlement policy for unsettled deliveries received at the Receiver. When            set at the Sender this indicates the desired value for the settlement mode at the            Receiver. When set at the Receiver this indicates the actual settlement mode in use.          </p></td></tr><tr><td>source</td><td>*</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the source for Messages</i><p>            If no source is specified on an outgoing Link, then there is no source currently            attached to the Link. A Link with no source will never produce outgoing Messages.          </p></td></tr><tr><td>target</td><td>*</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the target for Messages</i><p>            If no target is specified on an incoming Link, then there is no target currently            attached to the Link. A Link with no target will never permit incoming Messages.          </p></td></tr><tr><td>unsettled</td><td>map</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>unsettled delivery state</i><p>            This is used to indicate any unsettled delivery states when a suspended link is resumed.            The map is keyed by delivery-tag with values indicating the delivery state. The local            and remote delivery states for a given delivery-tag MUST be compared to resolve any            in-doubt deliveries. If necessary, deliveries MAY be resent, or resumed based on the            outcome of this comparison. See .          </p><p>resuming-deliveries</p><p>            If the local unsettled map is too large to be encoded within a frame of the agreed            maximum frame size then the session may be ended with the frame-size-too-small error            (see ). The endpoint SHOULD make use of the ability to send an            incomplete unsettled map (see below) to avoid sending an error.          </p><p>amqp-error</p><p>            The unsettled map MUST NOT contain null valued keys.          </p><p>            When reattaching (as opposed to resuming), the unsettled map MUST be null.          </p></td></tr><tr><td>incomplete-unsettled</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            If set to true this field indicates that the unsettled map provided is not complete.            When the map is incomplete the recipient of the map cannot take the absence of a            delivery tag from the map as evidence of settlement. On receipt of an incomplete            unsettled map a sending endpoint MUST NOT send any new deliveries (i.e. deliveries where            resume is not set to true) to its partner (and a receiving endpoint which sent an            incomplete unsettled map MUST detach with an error on receiving a transfer which does            not have the resume flag set to true).          </p></td></tr><tr><td>initial-delivery-count</td><td>sequence-no</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            This MUST NOT be null if role is sender, and it is ignored if the role is receiver. See            .          </p><p>flow-control</p></td></tr><tr><td>max-message-size</td><td>ulong</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the maximum message size supported by the link endpoint</i><p>            This field indicates the maximum message size supported by the link endpoint. Any            attempt to deliver a message larger than this results in a message-size-exceeded            . If this field is zero or unset, there is no maximum size            imposed by the link endpoint.          </p><p>link-error</p></td></tr><tr><td>offered-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender supports</i><p>            A list of commonly defined session capabilities and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/link-capabilities</p></td></tr><tr><td>desired-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender may use if the receiver supports them</i></td></tr><tr><td>properties</td><td>fields</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>link properties</i><p>            The properties map contains a set of fields intended to indicate information about the            link and its container.          </p><p>            A list of commonly defined link properties and their meanings can be found here:          </p><p>http://www.amqp.org/specification/1.0/link-properties</p></td></tr></table>

<a name="BeginFrame"></a>
#class: BeginFrame
**Members**

* [class: BeginFrame](#BeginFrame)
  * [new BeginFrame()](#new_BeginFrame)

<a name="new_BeginFrame"></a>
##new BeginFrame()
<h2>begin performative</h2><i>begin a Session on a channel</i><p>          Indicate that a Session has begun on the channel.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:begin:list</dd><dt>Code</dt><dd>0x00000000:0x00000011</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>remote-channel</td><td>ushort</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the remote channel for this Session</i><p>            If a Session is locally initiated, the remote-channel MUST NOT be set. When an endpoint            responds to a remotely initiated Session, the remote-channel MUST be set to the channel            on which the remote Session sent the begin.          </p></td></tr><tr><td>next-outgoing-id</td><td>transfer-number</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the transfer-id of the first transfer id the sender will send</i><p>See .</p><p>session-flow-control</p></td></tr><tr><td>incoming-window</td><td>uint</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the initial incoming-window of the sender</i><p>See .</p><p>session-flow-control</p></td></tr><tr><td>outgoing-window</td><td>uint</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the initial outgoing-window of the sender</i><p>See .</p><p>session-flow-control</p></td></tr><tr><td>handle-max</td><td>handle</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the maximum handle value that may be used on the Session</i><p>            The handle-max value is the highest handle value that may be used on the Session.            A peer MUST NOT attempt to attach a Link using a handle value outside the range that its            partner can handle. A peer that receives a handle outside the supported range MUST close            the Connection with the framing-error error-code.          </p></td></tr><tr><td>offered-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender supports</i><p>            A list of commonly defined session capabilities and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/session-capabilities</p></td></tr><tr><td>desired-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender may use if the receiver supports them</i></td></tr><tr><td>properties</td><td>fields</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>session properties</i><p>            The properties map contains a set of fields intended to indicate information about the            session and its container.          </p><p>            A list of commonly defined session properties and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/session-properties</p></td></tr></table>

<a name="CloseFrame"></a>
#class: CloseFrame
**Members**

* [class: CloseFrame](#CloseFrame)
  * [new CloseFrame()](#new_CloseFrame)

<a name="new_CloseFrame"></a>
##new CloseFrame()
<h2>close performative</h2><i>signal a Connection close</i><p>          Sending a close signals that the sender will not be sending any more frames (or bytes of          any other kind) on the Connection. Orderly shutdown requires that this frame MUST be          written by the sender. It is illegal to send any more frames (or bytes of any other kind)          after sending a close frame.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:close:list</dd><dt>Code</dt><dd>0x00000000:0x00000018</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>error</td><td>error</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>error causing the close</i><p>            If set, this field indicates that the Connection is being closed due to an error            condition. The value of the field should contain details on the cause of the error.          </p></td></tr></table>

<a name="DetachFrame"></a>
#class: DetachFrame
**Members**

* [class: DetachFrame](#DetachFrame)
  * [new DetachFrame()](#new_DetachFrame)

<a name="new_DetachFrame"></a>
##new DetachFrame()
<h2>detach performative</h2><i>detach the Link Endpoint from the Session</i><p>          Detach the Link Endpoint from the Session. This un-maps the handle and makes it available          for use by other Links.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:detach:list</dd><dt>Code</dt><dd>0x00000000:0x00000016</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>handle</td><td>handle</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the local handle of the link to be detached</i></td></tr><tr><td>closed</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>if true then the sender has closed the link</i><p>See .</p><p>closing-a-link</p></td></tr><tr><td>error</td><td>error</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>error causing the detach</i><p>            If set, this field indicates that the Link is being detached due to an error condition.            The value of the field should contain details on the cause of the error.          </p></td></tr></table>

<a name="DispositionFrame"></a>
#class: DispositionFrame
**Members**

* [class: DispositionFrame](#DispositionFrame)
  * [new DispositionFrame()](#new_DispositionFrame)

<a name="new_DispositionFrame"></a>
##new DispositionFrame()
<h2>disposition performative</h2><i>inform remote peer of delivery state changes</i><p>          The disposition frame is used to inform the remote peer of local changes in the state of          deliveries. The disposition frame may reference deliveries from many different links          associated with a session, although all links MUST have the directionality indicated by          the specified .        </p><p>          Note that it is possible for a disposition sent from sender to receiver to refer to a          delivery which has not yet completed (i.e. a delivery which is spread over multiple          frames and not all frames have yet been sent). The use of such interleaving is          discouraged in favor of carrying the modified state on the next          performative for the delivery.        </p><p>transfer</p><p>          The disposition performative may refer to deliveries on links that are no longer attached.          As long as the links have not been closed or detached with an error then the deliveries          are still "live" and the updated state MUST be applied.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:disposition:list</dd><dt>Code</dt><dd>0x00000000:0x00000015</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>role</td><td>role</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>directionality of disposition</i><p>            The role identifies whether the disposition frame contains information            about  link endpoints or  link endpoints.          </p></td></tr><tr><td>first</td><td>delivery-number</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>lower bound of deliveries</i><p>            Identifies the lower bound of delivery-ids for the deliveries in this set.          </p></td></tr><tr><td>last</td><td>delivery-number</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>upper bound of deliveries</i><p>            Identifies the upper bound of delivery-ids for the deliveries in this set. If not set,            this is taken to be the same as .          </p></td></tr><tr><td>settled</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>indicates deliveries are settled</i><p>            If true, indicates that the referenced deliveries are considered settled by the issuing            endpoint.          </p></td></tr><tr><td>state</td><td>*</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>indicates state of deliveries</i><p>            Communicates the state of all the deliveries referenced by this disposition.          </p></td></tr><tr><td>batchable</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>batchable hint</i><p>            If true, then the issuer is hinting that there is no need for the peer to urgently            communicate the impact of the updated delivery states. This hint may be used to            artificially increase the amount of batching an implementation uses when communicating            delivery states, and thereby save bandwidth.          </p></td></tr></table>

<a name="EndFrame"></a>
#class: EndFrame
**Members**

* [class: EndFrame](#EndFrame)
  * [new EndFrame()](#new_EndFrame)

<a name="new_EndFrame"></a>
##new EndFrame()
<h2>end performative</h2><i>end the Session</i><p>Indicates that the Session has ended.</p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:end:list</dd><dt>Code</dt><dd>0x00000000:0x00000017</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>error</td><td>error</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>error causing the end</i><p>            If set, this field indicates that the Session is being ended due to an error condition.            The value of the field should contain details on the cause of the error.          </p></td></tr></table>

<a name="FlowFrame"></a>
#class: FlowFrame
**Members**

* [class: FlowFrame](#FlowFrame)
  * [new FlowFrame()](#new_FlowFrame)

<a name="new_FlowFrame"></a>
##new FlowFrame()
<h2>flow performative</h2><i>update link state</i><p>Updates the flow state for the specified Link.</p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:flow:list</dd><dt>Code</dt><dd>0x00000000:0x00000013</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>next-incoming-id</td><td>transfer-number</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            Identifies the expected transfer-id of the next incoming  frame.            This value is not set if and only if the sender has not yet received the             frame for the session. See             for more details.          </p><p>transfer</p></td></tr><tr><td>incoming-window</td><td>uint</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            Defines the maximum number of incoming  frames that the endpoint            can currently receive. See  for more            details.          </p><p>transfer</p></td></tr><tr><td>next-outgoing-id</td><td>transfer-number</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            The transfer-id that will be assigned to the next outgoing            frame. See  for more details.          </p><p>transfer</p></td></tr><tr><td>outgoing-window</td><td>uint</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            Defines the maximum number of outgoing  frames that the endpoint            could potentially currently send, if it was not constrained by restrictions imposed by            its peer's incoming-window. See  for more            details.          </p><p>transfer</p></td></tr><tr><td>handle</td><td>handle</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            If set, indicates that the flow frame carries flow state information for the local Link            Endpoint associated with the given handle.  If not set, the flow frame is carrying only            information pertaining to the Session Endpoint.          </p><p>            If set to a handle that is not currently associated with an attached Link, the            recipient MUST respond by ending the session with an  session error.          </p><p>session-error</p></td></tr><tr><td>delivery-count</td><td>sequence-no</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the endpoint's delivery-count</i><p>            When the handle field is not set, this field MUST NOT be set.          </p><p>            When the handle identifies that the flow state is being sent from the Sender Link            Endpoint to Receiver Link Endpoint this field MUST be set to the current delivery-count            of the Link Endpoint.          </p><p>            When the flow state is being sent from the Receiver Endpoint to the Sender Endpoint this            field MUST be set to the last known value of the corresponding Sending Endpoint. In the            event that the Receiving Link Endpoint has not yet  seen the initial             frame from the Sender this field MUST NOT be set.          </p><p>attach</p><p>            See  for more details.          </p><p>flow-control</p></td></tr><tr><td>link-credit</td><td>uint</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the current maximum number of Messages that can be received</i><p>            The current maximum number of Messages that can be handled at the Receiver            Endpoint of the Link. Only the receiver endpoint can independently set this value. The            sender endpoint sets this to the last known value seen from the receiver. See             for more details.          </p><p>flow-control</p><p>            When the handle field is not set, this field MUST NOT be set.          </p></td></tr><tr><td>available</td><td>uint</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the number of available Messages</i><p>            The number of Messages awaiting credit at the link sender endpoint. Only the            sender can independently set this value. The receiver sets this to the last known value            seen from the sender. See  for more details.          </p><p>flow-control</p><p>            When the handle field is not set, this field MUST NOT be set.          </p></td></tr><tr><td>drain</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>indicates drain mode</i><p>            When flow state is sent from the sender to the receiver, this field contains the actual            drain mode of the sender. When flow state is sent from the receiver to the sender, this            field contains the desired drain mode of the receiver. See  for more details.          </p><p>flow-control</p><p>            When the handle field is not set, this field MUST NOT be set.          </p></td></tr><tr><td>echo</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>request link state from other endpoint</i></td></tr><tr><td>properties</td><td>fields</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>link state properties</i><p>            A list of commonly defined link state properties and their meanings can be found here:          </p><p>http://www.amqp.org/specification/1.0/link-state-properties</p></td></tr></table>

<a name="Frame"></a>
#class: Frame
**Members**

* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame._buildOutgoing()](#Frame#_buildOutgoing)
  * [frame.readPerformative(describedType)](#Frame#readPerformative)

<a name="new_Frame"></a>
##new Frame()
Encapsulates all convenience methods required for encoding a frame to put it out on the wire, and decoding anincoming frame.Frames look like:<pre>
             +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |---> Frame Header
      4 |  DOFF  |  TYPE  | <TYPE-SPECIFIC> |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |---> Extended Header
        .          <TYPE-SPECIFIC>          .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |                                   |  |
        .                                   .  |
        .                                   .  |
        .                                   .  |
        .          <TYPE-SPECIFIC>          .  |---> Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .                                   .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

 </pre>

<a name="Frame#_buildOutgoing"></a>
##frame._buildOutgoing()
Populate the internal buffer with contents built based on the options.  SIZE and DOFF will be inferredbased on the options given.

**Access**: private  
<a name="Frame#readPerformative"></a>
##frame.readPerformative(describedType)
Used to populate the frame performative from a DescribedType pulled off the wire.

**Params**

- describedType <code>[DescribedType](#DescribedType)</code> - Details of the frame performative, should populate internal values.  

<a name="AMQPFrame"></a>
#class: AMQPFrame
**Members**

* [class: AMQPFrame](#AMQPFrame)
  * [new AMQPFrame()](#new_AMQPFrame)
  * [aMQPFrame.outgoing()](#AMQPFrame#outgoing)
  * [aMQPFrame._getPerformative()](#AMQPFrame#_getPerformative)
  * [aMQPFrame._getAdditionalPayload()](#AMQPFrame#_getAdditionalPayload)

<a name="new_AMQPFrame"></a>
##new AMQPFrame()
AMQP Frames are slight variations on the one above, with the first part of the payload taken upby the AMQP <i>performative</i> (details of the specific frame type).  For some frames, that's the entire payload.
<pre>
      +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |---> Frame Header
      4 |  DOFF  |  TYPE  |     CHANNEL     |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |---> Extended Header
        .             <IGNORED>             .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |           PERFORMATIVE:           |  |
        .      Open / Begin / Attach        .  |
        .   Flow / Transfer / Disposition   .  |
        .      Detach / End / Close         .  |
        |-----------------------------------|  |
        .                                   .  |---> Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .             PAYLOAD               .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

</pre>

<a name="AMQPFrame#outgoing"></a>
##aMQPFrame.outgoing()
Children can override this method to perform more finely-tuned outgoing buffer processing.

<a name="AMQPFrame#_getPerformative"></a>
##aMQPFrame._getPerformative()
Children should implement this method to translate their internal (friendly) representation into therepresentation expected on the wire (a DescribedType(Descriptor, ...) with either a List of values(ForcedType'd as necessary) or an object containing an encodeOrdering[] array to clarify ordering).

**Access**: private  
<a name="AMQPFrame#_getAdditionalPayload"></a>
##aMQPFrame._getAdditionalPayload()
AMQP Frames consist of two sections of payload - the performative, and the additional actual payload.Some frames don't have any additional payload, but for those that do, they should override this to generate it.

**Access**: private  
<a name="OpenFrame"></a>
#class: OpenFrame
**Members**

* [class: OpenFrame](#OpenFrame)
  * [new OpenFrame()](#new_OpenFrame)

<a name="new_OpenFrame"></a>
##new OpenFrame()
<h2>open performative</h2><i>negotiate Connection parameters</i><p>          The first frame sent on a connection in either direction MUST contain an Open body. (Note          that the Connection header which is sent first on the Connection is *not* a frame.) The          fields indicate the capabilities and limitations of the sending peer.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:open:list</dd><dt>Code</dt><dd>0x00000000:0x00000010</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>container-id</td><td>string</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the id of the source container</i></td></tr><tr><td>hostname</td><td>string</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the name of the target host</i><p>            The dns name of the host (either fully qualified or relative) to which the sending peer            is connecting. It is not mandatory to provide the hostname. If no hostname is provided            the receiving peer should select a default based on its own configuration. This field            can be used by AMQP proxies to determine the correct back-end service to connect            the client to.          </p><p>            This field may already have been specified by the  frame, if a            SASL layer is used, or, the server name indication extension as described in            RFC-4366, if a TLS layer is used, in which case this field SHOULD be null or contain            the same value. It is undefined what a different value to those already specific means.          </p><p>sasl-init</p></td></tr><tr><td>max-frame-size</td><td>uint</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>proposed maximum frame size</i><p>            The largest frame size that the sending peer is able to accept on this Connection. If            this field is not set it means that the peer does not impose any specific limit. A peer            MUST NOT send frames larger than its partner can handle. A peer that receives an            oversized frame MUST close the Connection with the framing-error error-code.          </p><p>            Both peers MUST accept frames of up to  octets            large.          </p><p>MIN-MAX-FRAME-SIZE</p></td></tr><tr><td>channel-max</td><td>ushort</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the maximum channel number that may be used on the Connection</i><p>            The channel-max value is the highest channel number that may be used on the Connection.            This value plus one is the maximum number of Sessions that can be simultaneously active            on the Connection. A peer MUST not use channel numbers outside the range that its            partner can handle. A peer that receives a channel number outside the supported range            MUST close the Connection with the framing-error error-code.          </p></td></tr><tr><td>idle-time-out</td><td>milliseconds</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>idle time-out</i><p>            The idle time-out required by the sender. A value of zero is the same as if it was            not set (null). If the receiver is unable or unwilling to support the idle time-out            then it should close the connection with an error explaining why (eg, because it is            too small).          </p><p>            If the value is not set, then the sender does not have an idle time-out. However,            senders doing this should be aware that implementations MAY choose to use an            internal default to efficiently manage a peer's resources.          </p></td></tr><tr><td>outgoing-locales</td><td>ietf-language-tag</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>locales available for outgoing text</i><p>            A list of the locales that the peer supports for sending informational text. This            includes Connection, Session and Link error descriptions. A peer MUST support at least            the  locale (see ). Since this value is            always supported, it need not be supplied in the outgoing-locales. A null value or an            empty list implies that only  is supported.          </p><p>ietf-language-tag</p></td></tr><tr><td>incoming-locales</td><td>ietf-language-tag</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>desired locales for incoming text in decreasing level of preference</i><p>            A list of locales that the sending peer permits for incoming informational text. This            list is ordered in decreasing level of preference. The receiving partner will chose the            first (most preferred) incoming locale from those which it supports. If none of the            requested locales are supported,  will be chosen. Note that            need not be supplied in this list as it is always the fallback. A peer may determine            which of the permitted incoming locales is chosen by examining the partner's supported            locales as specified in the outgoing-locales field. A null value or an empty list            implies that only  is supported.          </p></td></tr><tr><td>offered-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender supports</i><p>            If the receiver of the offered-capabilities requires an extension capability which is            not present in the offered-capability list then it MUST close the connection.          </p><p>            A list of commonly defined connection capabilities and their meanings can be found here:            .          </p><p>http://www.amqp.org/specification/1.0/connection-capabilities</p></td></tr><tr><td>desired-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender may use if the receiver supports them</i><p>            The desired-capability list defines which extension capabilities the sender MAY use if            the receiver offers them (i.e. they are in the offered-capabilities list received by the            sender of the desired-capabilities). If the receiver of the desired-capabilities offers            extension capabilities which are not present in the desired-capability list it received,            then it can be sure those (undesired) capabilities will not be used on the            Connection.          </p></td></tr><tr><td>properties</td><td>fields</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>connection properties</i><p>            The properties map contains a set of fields intended to indicate information about the            connection and its container.          </p><p>            A list of commonly defined connection properties and their meanings can be found here:          </p><p>http://www.amqp.org/specification/1.0/connection-properties</p></td></tr></table>

<a name="TransferFrame"></a>
#class: TransferFrame
**Members**

* [class: TransferFrame](#TransferFrame)
  * [new TransferFrame()](#new_TransferFrame)

<a name="new_TransferFrame"></a>
##new TransferFrame()
<h2>transfer performative</h2><i>transfer a Message</i><p>          The transfer frame is used to send Messages across a Link. Messages may be carried by a          single transfer up to the maximum negotiated frame size for the Connection. Larger          Messages may be split across several transfer frames.        </p><h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:transfer:list</dd><dt>Code</dt><dd>0x00000000:0x00000014</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>handle</td><td>handle</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>Specifies the Link on which the Message is transferred.</p></td></tr><tr><td>delivery-id</td><td>delivery-number</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>alias for delivery-tag</i><p>            The delivery-id MUST be supplied on the first transfer of a multi-transfer delivery. On            continuation transfers the delivery-id MAY be omitted. It is an error if the delivery-id            on a continuation transfer differs from the delivery-id on the first transfer of a            delivery.          </p></td></tr><tr><td>delivery-tag</td><td>delivery-tag</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            Uniquely identifies the delivery attempt for a given Message on this Link. This field            MUST be specified for the first transfer of a multi transfer message and may only be            omitted for continuation transfers.          </p></td></tr><tr><td>message-format</td><td>message-format</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>indicates the message format</i><p>            This field MUST be specified for the first transfer of a multi transfer message and may            only be omitted for continuation transfers.          </p></td></tr><tr><td>settled</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>             If not set on the first (or only) transfer for a delivery, then the settled flag MUST             be interpreted as being false. For subsequent transfers if the settled flag is left             unset then it MUST be interpreted as true if and only if the value of the settled flag             on any of the preceding transfers was true; if no preceding transfer was sent with             settled being true then the value when unset MUST be taken as false.          </p><p>             If the negotiated value for snd-settle-mode at attachment is , then this field MUST be true on at least             one transfer frame for a delivery (i.e. the delivery must be settled at the Sender at             the point the delivery has been completely transferred).          </p><p>sender-settle-mode</p><p>             If the negotiated value for snd-settle-mode at attachment is , then this field MUST be false (or             unset) on every transfer frame for a delivery (unless the delivery is aborted).          </p><p>sender-settle-mode</p></td></tr><tr><td>more</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>indicates that the Message has more content</i><p>            Note that if both the more and aborted fields are set to true, the aborted flag takes            precedence. That is a receiver should ignore the value of the more field if the            transfer is marked as aborted. A sender SHOULD NOT set the more flag to true if it            also sets the aborted flag to true.          </p></td></tr><tr><td>rcv-settle-mode</td><td>receiver-settle-mode</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2">undefined<p>            If , this indicates that the            Receiver MUST settle the delivery once it has arrived without waiting for the Sender to            settle first.          </p><p>receiver-settle-mode</p><p>            If , this indicates that the            Receiver MUST NOT settle until sending its disposition to the Sender and receiving a            settled disposition from the sender.          </p><p>receiver-settle-mode</p><p>            If not set, this value is defaulted to the value negotiated on link attach.          </p><p>            If the negotiated link value is ,            then it is illegal to set this field to .          </p><p>receiver-settle-mode</p><p>            If the message is being sent settled by the Sender, the value of this field is ignored.          </p><p>            The (implicit or explicit) value of this field does not form part of the transfer state,            and is not retained if a link is suspended and subsequently resumed.          </p></td></tr><tr><td>state</td><td>*</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the state of the delivery at the sender</i><p>            When set this informs the receiver of the state of the delivery at the sender. This is            particularly useful when transfers of unsettled deliveries are resumed after a resuming            a link. Setting the state on the transfer can be thought of as being equivalent to            sending a disposition immediately before the  performative, i.e.            it is the state of the delivery (not the transfer) that existed at the point the frame            was sent.          </p><p>transfer</p><p>            Note that if the  performative (or an earlier  performative referring to the delivery) indicates that the delivery            has attained a terminal state, then no future  or  sent by the sender can alter that terminal state.          </p><p>transfer</p></td></tr><tr><td>resume</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>indicates a resumed delivery</i><p>            If true, the resume flag indicates that the transfer is being used to reassociate an            unsettled delivery from a dissociated link endpoint. See             for more details.          </p><p>resuming-deliveries</p><p>            The receiver MUST ignore resumed deliveries that are not in its local unsettled map. The            sender MUST NOT send resumed transfers for deliveries not in its local unsettled map.          </p><p>            If a resumed delivery spans more than one transfer performative, then the resume flag            MUST be set to true on the first transfer of the resumed delivery.  For subsequent            transfers for the same delivery the resume flag may be set to true, or may be omitted.          </p><p>            In the case where the exchange of unsettled maps makes clear that all message data has            been successfully transferred to the receiver, and that only the final state (and            potentially settlement) at the sender needs to be conveyed, then a resumed delivery may            carry no payload and instead act solely as a vehicle for carrying the terminal state of            the delivery at the sender.           </p></td></tr><tr><td>aborted</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>indicates that the Message is aborted</i><p>            Aborted Messages should be discarded by the recipient (any payload within the frame            carrying the performative MUST be ignored). An aborted Message is implicitly settled.          </p></td></tr><tr><td>batchable</td><td>boolean</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>batchable hint</i><p>            If true, then the issuer is hinting that there is no need for the peer to urgently            communicate updated delivery state. This hint may be used to artificially increase the            amount of batching an implementation uses when communicating delivery states, and            thereby save bandwidth.          </p><p>            If the message being delivered is too large to fit within a single frame, then the            setting of batchable to true on any of the  performatives for the            delivery is equivalent to setting batchable to true for all the            performatives for the delivery.          </p><p>transfer</p><p>            The batchable value does not form part of the transfer state, and is not retained if            a link is suspended and subsequently resumed.          </p></td></tr></table>

<a name="Types"></a>
#class: Types
**Members**

* [class: Types](#Types)
  * [new Types()](#new_Types)
  * [types._listBuilder()](#Types#_listBuilder)
  * [types._initTypesArray()](#Types#_initTypesArray)
  * [types._initEncodersDecoders()](#Types#_initEncodersDecoders)

<a name="new_Types"></a>
##new Types()
Type definitions, encoders, and decoders - used extensively by [Codec](#Codec).

<a name="Types#_listBuilder"></a>
##types._listBuilder()
Encoder for list types, specified in AMQP 1.0 as:
 <pre>
 +----------= count items =----------+
 |                                   |
 n OCTETs   n OCTETs   |                                   |
 +----------+----------+--------------+------------+-------+
 |   size   |  count   |      ...    /|    item    |\ ...  |
 +----------+----------+------------/ +------------+ \-----+
 / /              \ \
 / /                \ \
 / /                  \ \
 +-------------+----------+
 | constructor |   data   |
 +-------------+----------+

 Subcategory     n
 =================
 0xC             1
 0xD             4
 </pre>

**Access**: private  
<a name="Types#_initTypesArray"></a>
##types._initTypesArray()
Initialize list of all types.  Each contains a number of encodings, one of which contains an encoder method and all contain decoders.

**Access**: private  
<a name="Types#_initEncodersDecoders"></a>
##types._initEncodersDecoders()
Initialize all encoders and decoders based on type array.

**Access**: private  
<a name="encoder"></a>
#encoder(val, buf, [codec])
Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint willencode to the fixed-zero-value, the short uint, or the full uint as appropriate).

**Params**

- val  - Value to encode (for fixed value encoders (e.g. null) this will be ignored)  
- buf `builder` - Buffer-builder into which to write code and encoded value  
- \[codec\] <code>[Codec](#Codec)</code> - If needed, the codec to encode other values (e.g. for lists/arrays)  

<a name="decoder"></a>
#decoder(buf, [codec])
Decoder methods decode an incoming buffer into an appropriate concrete JS entity.

**Params**

- buf `Buffer` - Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped)  
- \[codec\] <code>[Codec](#Codec)</code> - If needed, the codec to decode sub-values for composite types.  

**Returns**:  - Decoded value  
