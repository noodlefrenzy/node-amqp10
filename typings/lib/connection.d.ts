// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import { EventEmitter } from "events";

import Policy = require("./policies/policy");
import Session = require("./session");

/**
 * Connection states, from AMQP 1.0 spec:
 *
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
 </dl>
 *
 * Connection negotiation state diagram from AMQP 1.0 spec:
 *
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
 </pre>
 *
 * R:<b>CTRL</b> = Received <b>CTRL</b>
 *
 * S:<b>CTRL</b> = Sent <b>CTRL</b>
 *
 * Also could be DISCARDING if an error condition triggered the CLOSE
 */
declare class Connection extends EventEmitter {
    policy: Policy.Connect;
    connected: boolean;
    connectedTo: any;

    local: any;
    remote: any;

    connSM: any;

    static Connected: "connection:connected";
    static Disconnected: "connection:disconnected";
    /**
     * On receipt of a frame not handled internally (e.g. not a BEGIN/CLOSE/SASL).
     * Provides received frame as an argument.
     */
    static FrameReceived: "connection:frameReceived";
    /**
     * Since 'error' events are "special" in Node (as in halt-the-process special),
     * using a custom event for errors we receive from the other endpoint. Provides
     * received AMQPError as an argument.
     */
    static ErrorReceived: "connection:errorReceived";

    /**
     * Creates a new Connection instance.
     *
     * @param connectPolicy ConnectPolicy from a Policy instance
     * @constructor
     */
    constructor(connectPolicy: Policy.Connect);

    /**
     * Open a connection to the given (parsed) address (@see {@link AMQPClient}).
     *
     * @param address   Contains at least protocol, host and port, may contain user/pass, path.
     * @param sasl      If given, contains a "negotiate" method that, given address and a callback, will run through SASL negotiations.
     */
    open(address: Policy.Address, sasl?: { negotiate(address: Policy.Address, callback: Function): void; }): void;

    close(): void;

    sendFrame(frame: any): void;

    associateSession(session: Session): number;
    dissociateSession(channel: number): void;

    sendHeader(header: Buffer): void;
}

export = Connection;
