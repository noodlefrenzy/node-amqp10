#Index

**Classes**

* [class: CircularBuffer](#CircularBuffer)
  * [new CircularBuffer(initialSize)](#new_CircularBuffer)
* [class: Codec](#Codec)
  * [new Codec()](#new_Codec)
  * [codec.decode(cbuf)](#Codec#decode)
  * [codec.encode(val, buf, offset, [forceType])](#Codec#encode)
* [class: Connection](#Connection)
  * [new Connection()](#new_Connection)
* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)

**Functions**

* [encoder(val, buf, offset)](#encoder)
* [decoder(buf)](#decoder)

**Members**

* [types](#types)
 
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
  * [codec.decode(cbuf)](#Codec#decode)
  * [codec.encode(val, buf, offset, [forceType])](#Codec#encode)

<a name="new_Codec"></a>
##new Codec()
Build a codec, turning constants defining AMQP1.0 types into specific bitsyntax parsers and builders.

<a name="Codec#decode"></a>
##codec.decode(cbuf)
Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.

**Params**

- cbuf `*` - The circular buffer to decode.  Will decode a single value per call.  

**Returns**:  - Single decoded value.  
<a name="Codec#encode"></a>
##codec.encode(val, buf, offset, [forceType])
Encode the given value as an AMQP 1.0 bitstring.

**Params**

- val   
- buf   
- offset   
- \[forceType\] `string` - If set, forces the encoder for the given type.  

**Returns**:  - N/A  
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

 </pre> R:<b>CTRL</b> = Received <b>CTRL</b> S:<b>CTRL</b> = Sent <b>CTRL</b> Also could be DISCARDING if an error condition triggered the CLOSE

<a name="Frame"></a>
#class: Frame
**Members**

* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)

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

<a name="encoder"></a>
#encoder(val, buf, offset)
Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint willencode to the fixed-zero-value, the short uint, or the full uint as appropriate).

**Params**

- val  - Value to encode (for fixed value encoders (e.g. null) this will be ignored)  
- buf `Buffer` - Buffer into which to write code and encoded value  
- offset `integer` - Non-negative byte offset for buffer  

**Returns**: `integer` - New offset value  
<a name="decoder"></a>
#decoder(buf)
Decoder methods decode an incoming buffer into an appropriate concrete JS entity.

**Params**

- buf `Buffer` - Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped)  

**Returns**:  - Decoded value  
<a name="types"></a>
#types
List of all types.  Each contains a number of encodings, one of which contains an encoder method and all contain decoders.

**Type**: [types](#types)  
