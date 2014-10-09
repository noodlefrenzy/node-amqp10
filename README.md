node-amqp-1-0
=============

AMQP 1.0-compliant Node.js client.  Since AMQP 1.0 is such a large departure from 0.9.1, 
I've started a new project rather than fork from node-amqp or amqp.node.  Both node-amqp and amqp.node are
great 0.9.1 clients and I recommend them, but neither is pursuing a 1.0 implementation.  If I can find an
easy way to integrate this code back into them, I'll definitely be submitting a PR.

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
