var EventEmitter    = require('events').EventEmitter,
    util        = require('util'),

    StateMachine= require('stately.js'),

    debug       = require('debug')('amqp10-Session'),
    debugLink   = require('debug')('amqp10-Link'),

    BeginFrame  = require('./frames/begin_frame'),
    EndFrame    = require('./frames/end_frame'),

    Connection  = require('./connection');

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
var Session = function(conn) {
    Session.super_.call(this);
    this.connection = conn;
    this._links = {};

    var self = this;
    var stateMachine = {
        'UNMAPPED': {
            sendBegin: function() {
                return this.BEGIN_SENT;
            }
        },
        'BEGIN_SENT': {
            beginReceived: function(frame) {
                self._beginReceived(frame);
                return this.MAPPED;
            }
        },
        'MAPPED': {
            sendEnd: function() {
                self._sendEnd();
                return this.END_SENT;
            },
            endReceived: function(frame) {
                self._endReceived(frame);
                return this.END_RCVD;
            }
        },
        'END_SENT': {
            endReceived: function(frame) {
                self._endReceived(frame);
                self._detach();
                return this.UNMAPPED;
            }
        },
        'DISCARDING': {
            endReceived: function(frame) {
                self._endReceived(frame);
                self._detach();
                return this.UNMAPPED;
            }
        },
        'END_RCVD': {
            sendEnd: function() {
                self._sendEnd();
                self._detach();
                return this.UNMAPPED;
            }
        }
    };

    this.sessionSM = new StateMachine(stateMachine).bind(function(event, oldState, newState) {
        debug('Transitioning from '+oldState+' to '+newState+' due to '+event);
    });
};

util.inherits(Session, EventEmitter);

// Events
Session.Mapped = 'mapped';
Session.Unmapped = 'unmapped';
// On receipt of a message.  Message payload given as argument.
Session.MessageReceived = 'rxMessage';
// Since 'error' events are "special" in Node (as in halt-the-process special), using a custom event for errors
// we receive from the other endpoint.  Provides received AMQPError as an argument.
Session.ErrorReceived = 'rxError';

Session.prototype.begin = function(sessionParams) {
    this.channel = this.connection.associateSession(this);
    this.sessionParams = sessionParams;
    this.sessionSM.sendBegin();
    var self = this;
    this.connection.on(Connection.FrameReceived, function(frame) { self._processFrame(frame); });
    var beginFrame = new BeginFrame(this.sessionParams);
    beginFrame.channel = this.channel;
    this.connection.sendFrame(beginFrame);
};

Session.prototype.attachLink = function(linkParams) {
    linkParams.handle = this._nextHandle();
    var newLink = new Link(this);
    this._links[linkParams.handle] = newLink;
    newLink.attach(linkOptions);
    return newLink;
};

Session.prototype.detachLink = function(link) {
    link.detach();
};

Session.prototype.end = function() {
    if (this.remoteChannel) {
        this.sessionSM.sendEnd();
    } else {
        console.warn('Attempt to end session on channel ' + this.channel + ' before it is mapped.');
        this._detach();
    }
};

Session.prototype._nextHandle = function() {
    for (var hid = 1; hid <= this.sessionParams.handleMax; ++hid) {
        if (this._links[hid] === undefined) return hid;
    }
    throw new exceptions.OverCapacityError('Out of available ' + this.sessionParams.handleMax + ' handles');
};

Session.prototype._processFrame = function(frame) {
    if (frame instanceof BeginFrame) {
        this.sessionSM.beginReceived(frame);
    } else if (frame instanceof EndFrame) {
        this.sessionSM.endReceived(frame);
        if (this.sessionSM.getMachineState() === 'END_RCVD') {
            this.sessionSM.sendEnd();
        }
    } else {
        debug('Not yet processing frame ' + JSON.stringify(frame));
    }
};

Session.prototype._beginReceived = function(frame) {
    this.remoteChannel = frame.remoteChannel;
    this.sessionParams.nextIncomingId = frame.nextOutgoingId;
    this.sessionParams.remoteIncomingWindow = frame.incomingWindow;
    this.sessionParams.remoteOutgoingWindow = frame.outgoingWindow;
    this.sessionParams.handleMax = Math.min(this.sessionParams.handleMax, frame.handleMax || constants.defaultHandleMax);
    // @todo Cope with capabilities and properties
    this.emit(Session.Mapped);
};

Session.prototype._endReceived = function(frame) {
    if (frame.error) {
        this.emit(Session.ErrorReceived, frame.error);
    }
};

Session.prototype._sendEnd = function(frame) {
    var endFrame = new EndFrame();
    endFrame.channel = this.remoteChannel;
    this.connection.sendFrame(endFrame);
};

Session.prototype._detach = function() {
    if (this.connection && this.channel) {
        this.connection.removeListener(Connection.FrameReceived, this._processFrame);
        this.connection.dissociateSession(this.channel);
        this.emit(Session.Unmapped);
    }
};

function Link(session) {
    this.session = session;
    this.remoteHandle = undefined;

    var self = this;
    var stateMachine = {
        'DETACHED': {
            sendAttach: function() {
                return this.ATTACHING;
            }
        },
        'ATTACHING': {
            attachReceived: function(frame) {
                self._attachReceived(frame);
                return this.ATTACHED;
            }
        },
        'ATTACHED': {
            sendDetach: function() {
                self._sendDetach();
                return this.DETACHING;
            },
            detachReceived: function(frame) {
                self._sendDetach();
                self._detachReceived(frame);
                return this.DETACHED;
            }
        },
        'DETACHING': {
            detachReceived: function(frame) {
                return this.DETACHED;
            }
        }
    };

    this.linkSM = new StateMachine(stateMachine).bind(function(event, oldState, newState) {
        debugLink('Transitioning from '+oldState+' to '+newState+' due to '+event);
    });
}

Link.prototype.attach = function(linkOptions) {

};

Link.prototype.detach = function() {

};

module.exports = Session;