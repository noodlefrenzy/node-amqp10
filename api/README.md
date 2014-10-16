#Index

**Classes**

* [class: CircularBuffer](#CircularBuffer)
  * [new CircularBuffer(initialSize)](#new_CircularBuffer)
* [class: Codec](#Codec)
  * [new Codec()](#new_Codec)
  * [codec._readFullValue(buf, [offset])](#Codec#_readFullValue)
  * [codec.decode(buf, [offset])](#Codec#decode)
  * [codec._isInteger(n)](#Codec#_isInteger)
  * [codec.encode(val, buf, [offset], [forceType])](#Codec#encode)
* [class: Connection](#Connection)
  * [new Connection()](#new_Connection)
* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame._buildOutgoing(options)](#Frame#_buildOutgoing)
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
  * [codec._readFullValue(buf, [offset])](#Codec#_readFullValue)
  * [codec.decode(buf, [offset])](#Codec#decode)
  * [codec._isInteger(n)](#Codec#_isInteger)
  * [codec.encode(val, buf, [offset], [forceType])](#Codec#encode)

<a name="new_Codec"></a>
##new Codec()
Build a codec.

<a name="Codec#_readFullValue"></a>
##codec._readFullValue(buf, [offset])
Reads a full value's worth of bytes from a circular or regular buffer, or returns undefined if not enough bytes are there.Note that for Buffers, the returned Buffer will be a slice (so backed by the original storage)!

**Params**

- buf `Buffer` | `CBuffer` - Buffer or circular buffer to read from.  If a Buffer is given, it is assumed to be full.  
- \[offset=0\] `integer` - Offset - only valid for Buffer, not CBuffer.  

**Returns**: `Array` - Buffer of full value + number of bytes read  
**Access**: private  
<a name="Codec#decode"></a>
##codec.decode(buf, [offset])
Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.

**Params**

- buf `Buffer` | `CBuffer` - The buffer/circular buffer to decode.  Will decode a single value per call.  
- \[offset=0\] `integer` - The offset to read from (only used for Buffers).  

**Returns**: `Array` - Single decoded value + number of bytes consumed.  
<a name="Codec#_isInteger"></a>
##codec._isInteger(n)
Acquired from http://stackoverflow.com/questions/3885817/how-to-check-if-a-number-is-float-or-integer

**Params**

- n `number` - Number to test.  

**Returns**: `boolean` - True if integral.  
**Access**: private  
<a name="Codec#encode"></a>
##codec.encode(val, buf, [offset], [forceType])
Encode the given value as an AMQP 1.0 bitstring.

**Params**

- val  - Value to encode.  
- buf  - Buffer to write into.  
- \[offset=0\]  - Offset at which to start writing.  
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

<a name="Frame"></a>
#class: Frame
**Members**

* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame._buildOutgoing(options)](#Frame#_buildOutgoing)

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
##frame._buildOutgoing(options)
Populate the internal buffer with contents built based on the options.  SIZE and DOFF will be inferredbased on the options given.

**Params**

- options `Object` - Following options are expected/[supported]:                             - [type]: Assumed to be 0x0 - AMQP                             - payload: Buffer of bytes to be sent                             - [extendedHeader]: Buffer of bytes for the extended header.                             AMQP-frame-specific:                             - channel: Channel number                             - performative: AMQP frame details                             Non-AMQP-frame-specific:                             - typeSpecificHeader: 2-byte integer for bytes 7 & 8 of header.  

**Access**: private  
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
