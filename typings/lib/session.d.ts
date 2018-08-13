// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import { EventEmitter } from "events";

import Policy = require("./policies/policy");
import Connection = require("./connection");
import ReceiverLink = require("./receiver_link");
import SenderLink = require("./sender_link");
import Link = require("./link");

/**
 * A Session is a bidirectional sequential conversation between two containers that provides a
 * grouping for related links. Sessions serve as the context for link communication. Any number
 * of links of any directionality can be <i>attached</i> to a given Session. However, a link
 * may be attached to at most one Session at a time.
 *
 * Session states, from AMQP 1.0 spec:
 *
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
  </pre>
 *
 * There is no obligation to retain a Session Endpoint when it is in the UNMAPPED state, i.e.
 * the UNMAPPED state is equivalent to a NONEXISTENT state.
 *
 * Note: This implementation *assumes* it is the client, and thus will always be the one BEGIN-ing a Session.
 *
 * @param {Connection} conn     Connection to bind session to.
 * @constructor
 */
declare class Session extends EventEmitter {
    connection: Connection;
    mapped: boolean;
    remoteChannel: any;
    sessionSM: any;
    
    static Mapped: "mapped";
    static Unmapped: "unmapped";
    static ErrorReceived: "errorReceived";
    static DispositionReceived: "disposition";
    
    /**
     * Create a new Session instance.
     * 
     * @param {Connection} conn - Connection to bind session to.
     * @constructor
     */
    constructor(conn: Connection);
    
    begin(sessionPolicy: Policy.Session): void;
    
    createLink(linkPolicy: Policy.ReceiverLink): ReceiverLink;
    createLink(linkPolicy: Policy.SenderLink): SenderLink;
    
    addWindow(windowSize: number, flowOptions?: Link.FlowOptions): void;
    
    detachLink(link: Link): Promise<void>;
    
    end(): void;
}

export = Session;
