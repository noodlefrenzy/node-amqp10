node-amqp-1-0
=============

[![Build Status](https://secure.travis-ci.org/noodlefrenzy/node-amqp-1-0.png?branch=master)](https://travis-ci.org/noodlefrenzy/node-amqp-1-0)
[![Dependency Status](https://david-dm.org/noodlefrenzy/node-amqp-1-0.png)](https://david-dm.org/noodlefrenzy/node-amqp-1-0)

AMQP 1.0-compliant Node.js client.  Since AMQP 1.0 is such a large departure from 0.9.1, 
I've started a new project rather than fork from node-amqp or amqp.node.  Both node-amqp and amqp.node are
great 0.9.1 clients and I recommend them, but neither is pursuing a 1.0 implementation.  If I can find an
easy way to integrate this code back into them, I'll definitely be submitting a PR.

## Implementation Notes ##

Here are my current implementation plans - if you have feedback or critiques on any of these choices, feel free to
submit an Issue or even a PR.  Trust me, I don't take criticism personally, and I'm new to Nodejs so I could be making
"obviously bad" choices to someone who is more familiar with the landscape.

+   I'm planning on using Node's built-in net/socket classes for communicating with the server.
+   Data from the server will be written to a circular buffer based on [CBarrick's](https://github.com/cbarrick/CircularBuffer).
+   The connection state will be managed using [Stately.js](https://github.com/fschaefer/Stately.js), with state transitions
    swapping which callback gets invoked on receipt of new data. (e.g. post-connection, we write the AMQP version header
    and then install a callback to ensure the correct version.  Once incoming data is written to the circular buffer, this
    callback is invoked, and a comparison vs. the expected version triggers another transition).
+   Buffer comparisons are done via [Buffertools](https://github.com/bnoordhuis/node-buffertools).  Bit-twiddling is done
    via [node-butils](https://github.com/nlf/node-butils), if necessary.
+   Binary "parsing" and outgoing bitstream generation is done via [bitsyntax](https://github.com/squaremo/bitsyntax-js).

## Protocol Notes ##

The [AMQP 1.0 Protocol](http://docs.oasis-open.org/amqp/core/v1.0/amqp-core-complete-v1.0.pdf) differs substantially 
from the [0.9.1 protocol](http://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf), with 0.9.1 defining exchanges, brokers, 
types of queues (fanout, topic, etc.) and 1.0 focusing on more robust data interchange specifications and leaving much 
of the server implementation to the implementor.  This section is just attempting to document features of this protocol 
with the aim of enlightening those looking into the defined classes (and helping me drive my implementation).

+   Connection

    An AMQP connection is a full-duplex ordered sequence of frames.
    
+   Frame

    A Frame is the bitstream defining a full parsable unit.
    
+   Channel

    A connection is divided into a negotiated number of independent unidirectional channels.  Frames are marked with
    their parent channel number.
    
+   Session

    Correlation of two channels to form a bi-di sequential conversation.
    
    Connections may have multiple independent sessions active simultaneously, up to the negotiated channel limit.

+   Link
    
    Connection between two nodes.  Provides a credit-based flow-control scheme, each terminus of a link must track 
    stream state.  Links are named, and may outlive their associated connections, allowing reconnection and retention
    of associated state.
    
## Caveats ##

NOT YET IMPLEMENTED!  I'm just starting on this work - please ignore this repo for now.  Unless you want to help,
in which case PR's are welcome :)

## License ##

MIT License.  If you need a more permissive license, or you want to try your hand at integrating this code into
node-amqp or amqp.node and need to match their license, let me know (i.e. open an issue).
