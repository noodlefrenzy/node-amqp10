#Index

**Classes**

* [class: CircularBuffer](#CircularBuffer)
  * [new CircularBuffer(initialSize)](#new_CircularBuffer)
* [class: Codec](#Codec)
  * [new Codec()](#new_Codec)
  * [codec._isInteger(n)](#Codec#_isInteger)
  * [codec._readFullValue(buf, [offset], [doNotConsume])](#Codec#_readFullValue)
  * [codec.decode(buf, [offset])](#Codec#decode)
  * [codec.encode(val, buf, [offset], [forceType])](#Codec#encode)
* [class: Connection](#Connection)
  * [new Connection()](#new_Connection)
* [class: DescribedType](#DescribedType)
  * [new DescribedType(descriptor, value)](#new_DescribedType)
* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame._buildOutgoing()](#Frame#_buildOutgoing)
* [class: AMQPFrame](#AMQPFrame)
  * [new AMQPFrame()](#new_AMQPFrame)
* [class: OpenFrame](#OpenFrame)
  * [new OpenFrame()](#new_OpenFrame)
* [class: Types](#Types)
  * [new Types()](#new_Types)
  * [types._listEncoder()](#Types#_listEncoder)
    * [_listEncoder~tempBuffer](#Types#_listEncoder..tempBuffer)
  * [types._initTypesArray()](#Types#_initTypesArray)
  * [types._initEncodersDecoders()](#Types#_initEncodersDecoders)

**Functions**

* [encoder(val, buf, offset, [codec])](#encoder)
  * [encoder~encoded](#encoder..encoded)
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
  * [codec.encode(val, buf, [offset], [forceType])](#Codec#encode)

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
##codec.encode(val, buf, [offset], [forceType])
Encode the given value as an AMQP 1.0 bitstring.We do a best-effort to determine type.  Objects will be encoded as <code>maps</code>, unless:+ They are DescribedTypes, in which case they will be encoded as such.+ They contain an encodeOrdering array, in which case they will be encoded as a <code>list</code> of their values  in the specified order.+ They are Int64s, in which case they will be encoded as <code>longs</code>.

**Params**

- val  - Value to encode.  
- buf  - Buffer (or buffer-builder) to write into.  
- \[offset=0\]  - Offset at which to start writing.  Only needed for buffer.  
- \[forceType\] `string` - If set, forces the encoder for the given type.  

**Returns**: `integer` - New offset.  
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

<a name="Frame"></a>
#class: Frame
**Members**

* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame._buildOutgoing()](#Frame#_buildOutgoing)

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
<a name="AMQPFrame"></a>
#class: AMQPFrame
**Members**

* [class: AMQPFrame](#AMQPFrame)
  * [new AMQPFrame()](#new_AMQPFrame)

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

<a name="OpenFrame"></a>
#class: OpenFrame
**Members**

* [class: OpenFrame](#OpenFrame)
  * [new OpenFrame()](#new_OpenFrame)

<a name="new_OpenFrame"></a>
##new OpenFrame()
<h2>open performative</h2><i>negotiate Connection parameters</i>          The first frame sent on a connection in either direction MUST contain an Open body. (Note          that the Connection header which is sent first on the Connection is *not* a frame.) The          fields indicate the capabilities and limitations of the sending peer.<h3>Descriptor</h3><dl><dt>Name</dt><dd>amqp:open:list</dd><dt>Code</dt><dd>0x00000000:0x00000010</dd></dl><table><tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>container-id</td><td>string</td><td>true</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the id of the source container</i></td></tr><tr><td>hostname</td><td>string</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the name of the target host</i>            The dns name of the host (either fully qualified or relative) to which the sending peer            is connecting. It is not mandatory to provide the hostname. If no hostname is provided            the receiving peer should select a default based on its own configuration. This field            can be used by AMQP proxies to determine the correct back-end service to connect            the client to.            This field may already have been specified by the  frame, if a            SASL layer is used, or, the server name indication extension as described in            RFC-4366, if a TLS layer is used, in which case this field SHOULD be null or contain            the same value. It is undefined what a different value to those already specific means.sasl-init</td></tr><tr><td>max-frame-size</td><td>uint</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>proposed maximum frame size</i>            The largest frame size that the sending peer is able to accept on this Connection. If            this field is not set it means that the peer does not impose any specific limit. A peer            MUST NOT send frames larger than its partner can handle. A peer that receives an            oversized frame MUST close the Connection with the framing-error error-code.            Both peers MUST accept frames of up to  octets            large.MIN-MAX-FRAME-SIZE</td></tr><tr><td>channel-max</td><td>ushort</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the maximum channel number that may be used on the Connection</i>            The channel-max value is the highest channel number that may be used on the Connection.            This value plus one is the maximum number of Sessions that can be simultaneously active            on the Connection. A peer MUST not use channel numbers outside the range that its            partner can handle. A peer that receives a channel number outside the supported range            MUST close the Connection with the framing-error error-code.          </td></tr><tr><td>idle-time-out</td><td>milliseconds</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>idle time-out</i>            The idle time-out required by the sender. A value of zero is the same as if it was            not set (null). If the receiver is unable or unwilling to support the idle time-out            then it should close the connection with an error explaining why (eg, because it is            too small).            If the value is not set, then the sender does not have an idle time-out. However,            senders doing this should be aware that implementations MAY choose to use an            internal default to efficiently manage a peer's resources.          </td></tr><tr><td>outgoing-locales</td><td>ietf-language-tag</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>locales available for outgoing text</i>            A list of the locales that the peer supports for sending informational text. This            includes Connection, Session and Link error descriptions. A peer MUST support at least            the  locale (see ). Since this value is            always supported, it need not be supplied in the outgoing-locales. A null value or an            empty list implies that only  is supported.ietf-language-tag</td></tr><tr><td>incoming-locales</td><td>ietf-language-tag</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>desired locales for incoming text in decreasing level of preference</i>            A list of locales that the sending peer permits for incoming informational text. This            list is ordered in decreasing level of preference. The receiving partner will chose the            first (most preferred) incoming locale from those which it supports. If none of the            requested locales are supported,  will be chosen. Note that            need not be supplied in this list as it is always the fallback. A peer may determine            which of the permitted incoming locales is chosen by examining the partner's supported            locales as specified in the outgoing-locales field. A null value or an empty list            implies that only  is supported.          </td></tr><tr><td>offered-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender supports</i>            If the receiver of the offered-capabilities requires an extension capability which is            not present in the offered-capability list then it MUST close the connection.            A list of commonly defined connection capabilities and their meanings can be found here:            .http://www.amqp.org/specification/1.0/connection-capabilities</td></tr><tr><td>desired-capabilities</td><td>symbol</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender may use if the receiver supports them</i>            The desired-capability list defines which extension capabilities the sender MAY use if            the receiver offers them (i.e. they are in the offered-capabilities list received by the            sender of the desired-capabilities). If the receiver of the desired-capabilities offers            extension capabilities which are not present in the desired-capability list it received,            then it can be sure those (undesired) capabilities will not be used on the            Connection.          </td></tr><tr><td>properties</td><td>fields</td><td>false</td></tr><tr><td>&nbsp;</td><td colspan="2"><i>connection properties</i>            The properties map contains a set of fields intended to indicate information about the            connection and its container.            A list of commonly defined connection properties and their meanings can be found here:http://www.amqp.org/specification/1.0/connection-properties</td></tr></table>

<a name="Types"></a>
#class: Types
**Members**

* [class: Types](#Types)
  * [new Types()](#new_Types)
  * [types._listEncoder()](#Types#_listEncoder)
    * [_listEncoder~tempBuffer](#Types#_listEncoder..tempBuffer)
  * [types._initTypesArray()](#Types#_initTypesArray)
  * [types._initEncodersDecoders()](#Types#_initEncodersDecoders)

<a name="new_Types"></a>
##new Types()
Type definitions, encoders, and decoders - used extensively by [Codec](#Codec).

<a name="Types#_listEncoder"></a>
##types._listEncoder()
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
#encoder(val, buf, offset, [codec])
Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint willencode to the fixed-zero-value, the short uint, or the full uint as appropriate).

**Params**

- val  - Value to encode (for fixed value encoders (e.g. null) this will be ignored)  
- buf `Buffer` - Buffer into which to write code and encoded value  
- offset `integer` - Non-negative byte offset for buffer  
- \[codec\] <code>[Codec](#Codec)</code> - If needed, the codec to encode other values (e.g. for lists/arrays)  

**Returns**: `integer` - New offset value  
<a name="decoder"></a>
#decoder(buf, [codec])
Decoder methods decode an incoming buffer into an appropriate concrete JS entity.

**Params**

- buf `Buffer` - Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped)  
- \[codec\] <code>[Codec](#Codec)</code> - If needed, the codec to decode sub-values for composite types.  

**Returns**:  - Decoded value  
