var EventEmitter    = require('events').EventEmitter,
    util        = require('util'),

    StateMachine= require('stately.js'),

    debug       = require('debug')('amqp10-Session'),
    debugLink   = require('debug')('amqp10-Link'),

    AttachFrame = require('./frames/attach_frame'),
    BeginFrame  = require('./frames/begin_frame'),
    DetachFrame = require('./frames/detach_frame'),
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
    this.remoteChannel = undefined;
    this._links = {};

    var self = this;
    var stateMachine = {
        'UNMAPPED': {
            sendBegin: function() {
                return this.BEGIN_SENT;
            }
        },
        'BEGIN_SENT': {
            beginReceived: function() {
                return this.MAPPED;
            }
        },
        'MAPPED': {
            sendEnd: function() {
                return this.END_SENT;
            },
            endReceived: function() {
                return this.END_RCVD;
            }
        },
        'END_SENT': {
            endReceived: function() {
                return this.UNMAPPED;
            }
        },
        'DISCARDING': {
            endReceived: function() {
                return this.UNMAPPED;
            }
        },
        'END_RCVD': {
            sendEnd: function() {
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
// On successful attach, Link given as argument.
Session.LinkAttached = 'attached';
// On completion of detach, Link given as argument.
Session.LinkDetached = 'detached';

Session.prototype.begin = function(sessionParams) {
    this.channel = this.connection.associateSession(this);
    this.sessionParams = sessionParams;
    this.sessionSM.sendBegin();
    var self = this;
    this._processFrameEH = function(frame) { self._processFrame(frame); };
    this.connection.on(Connection.FrameReceived, this._processFrameEH);
    var beginFrame = new BeginFrame(this.sessionParams);
    beginFrame.channel = this.channel;
    this.connection.sendFrame(beginFrame);
};

Session.prototype.attachLink = function(linkParams) {
    linkParams.handle = this._nextHandle();
    var newLink = new Link(this);
    this._links[linkParams.handle] = newLink;
    newLink.attach(linkParams);
    return newLink;
};

Session.prototype.detachLink = function(link) {
    link.detach();
};

Session.prototype.end = function() {
    if (this.remoteChannel !== undefined) {
        var unmap = this.sessionSM.getMachineState() === 'END_RCVD';
        this.sessionSM.sendEnd();
        this._sendEnd();
        if (unmap) this._unmap();
    } else {
        console.warn('Attempt to end session on channel ' + this.channel + ' before it is mapped.');
        this._unmap();
    }
};

Session.prototype._nextHandle = function() {
    for (var hid = 1; hid <= this.sessionParams.handleMax; ++hid) {
        if (this._links[hid] === undefined) return hid;
    }
    throw new exceptions.OverCapacityError('Out of available ' + this.sessionParams.handleMax + ' handles');
};

Session.prototype._processFrame = function(frame) {
    debug('Processing frame '+frame.constructor.name+': '+JSON.stringify(frame));
    if (frame instanceof BeginFrame) {
        this.sessionSM.beginReceived();
        this._beginReceived(frame);
    } else if (frame instanceof EndFrame) {
        var unmap = this.sessionSM.getMachineState() !== 'MAPPED';
        this.sessionSM.endReceived();
        this._endReceived(frame);
        if (!unmap) {
            this.sessionSM.sendEnd();
            this._sendEnd();
        } else {
            this._unmap();
        }
    } else {
        debug('Not yet processing frame ' + JSON.stringify(frame));
    }
};

Session.prototype._beginReceived = function(frame) {
    debugger;
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

Session.prototype._unmap = function() {
    if (this.connection && this.channel) {
        this.connection.removeListener(Connection.FrameReceived, this._processFrameEH);
        this.connection.dissociateSession(this.channel);
        this.remoteChannel = undefined;
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
            attachReceived: function() {
                return this.ATTACHED;
            }
        },
        'ATTACHED': {
            sendDetach: function() {
                return this.DETACHING;
            },
            detachReceived: function() {
                self._sendDetach();
                return this.DETACHED;
            }
        },
        'DETACHING': {
            detachReceived: function() {
                return this.DETACHED;
            }
        }
    };

    this.linkSM = new StateMachine(stateMachine).bind(function(event, oldState, newState) {
        debugLink('Transitioning from '+oldState+' to '+newState+' due to '+event);
    });
}

Link.prototype.attach = function(linkParams) {
    this.linkParams = linkParams;
    this.linkSM.sendAttach();
    var attachFrame = new AttachFrame(linkParams);
    attachFrame.channel = this.session.remoteChannel;
    this.session.connection.sendFrame(attachFrame);
};

Link.prototype.detach = function() {
    this.linkSM.sendDetach();
    this._sendDetach();
};

Link.prototype.attachReceived = function(frame) {
    this.linkSM.attachReceived();
    // process params.
    this.session.emit(Session.LinkAttached, this);
};

Link.prototype.detachReceived = function(frame) {
    this.linkSM.detachReceived();
};

Link.prototype._sendDetach = function() {
    var detachFrame = new DetachFrame(this.linkParams);
    detachFrame.channel = this.session.remoteChannel;
    this.session.connection.sendFrame(detachFrame);
};

Link.prototype._detached = function() {
    this.session._links[this.linkParams.handle] = undefined;
    this.session.emit(Session.LinkDetached, this);
};

module.exports = Session;