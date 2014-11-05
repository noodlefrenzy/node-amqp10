
var debug       = require('debug')('amqp10-Session'),

    Connection  = require('./connection');

/**
 * A Session is a bidirectional sequential conversation between two containers that provides a
 * grouping for related links. Sessions serve as the context for link communication. Any number
 * of links of any directionality can be <i>attached</i> to a given Session. However, a link
 * may be attached to at most one Session at a time.
 *
 <pre>
 Link A-------+                          +----- >Link A
              |                          |
             \|/       (attached)        |
 Link B< -- Session <--------------> Session < --Link B


 Link C----- >*        (detached)        *----- >Link C
 </pre>
 * Messages transferred on a link are sequentially identified within the Session. A session may
 * be viewed as multiplexing link traffic, much like a connection multiplexes session traffic.
 * However, unlike the sessions on a connection, links on a session are not entirely
 * independent since they share a common delivery sequence scoped to the session. This common
 * sequence allows endpoints to efficiently refer to sets of deliveries regardless of the
 * originating link. This is of particular benefit when a single application is receiving
 * messages along a large number of different links. In this case the session
 * provides <i>aggregation</i> of otherwise independent links into a single stream that can be
 * efficiently acknowledged by the receiving application.
 *
 * Sessions are established by creating a Session Endpoint, assigning it to an unused channel
 * number, and sending a <code>begin</code> announcing the association of the
 * Session Endpoint with the outgoing channel. Upon receiving the <code>begin</code>
 * the partner will check the remote-channel field and find it empty. This
 * indicates that the begin is referring to remotely initiated Session. The partner will
 * therefore allocate an unused outgoing channel for the remotely initiated Session and
 * indicate this by sending its own <code>begin</code> setting the
 * remote-channel field to the incoming channel of the remotely initiated Session.
 *
 * To make it easier to monitor AMQP sessions, it is recommended that implementations always
 * assign the lowest available unused channel number.
 *
 * The remote-channel field of a <code>begin</code> frame MUST be empty for a
 * locally initiated Session, and MUST be set when announcing the endpoint created as a result
 * of a remotely initiated Session.
 *
 <pre>
 Endpoint                                      Endpoint
 =====================================================================
 [CH3] BEGIN(name=...,        -------- >
             remote-channel=null)
                                     +-- [CH7] BEGIN(name=...,
                                    /                remote-channel=3)
                                   /
                              < --+
                              ...
 </pre>
 *
 * @param {Connection} conn     Connection to bind session to.
 * @constructor
 */
var Session = function(conn) {
    this.connection = conn;
};

module.exports = Session;