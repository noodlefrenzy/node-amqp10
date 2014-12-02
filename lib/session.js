var EventEmitter    = require('events').EventEmitter,
    util        = require('util'),

    StateMachine= require('stately.js'),

    debug       = require('debug')('amqp10-Session'),
    debugLink   = require('debug')('amqp10-Link'),

    constants   = require('./constants'),
    exceptions  = require('./exceptions'),
    u           = require('./utilities'),

    AttachFrame = require('./frames/attach_frame'),
    BeginFrame  = require('./frames/begin_frame'),
    DetachFrame = require('./frames/detach_frame'),
    EndFrame    = require('./frames/end_frame'),
    FlowFrame   = require('./frames/flow_frame'),
    TransferFrame   = require('./frames/transfer_frame'),

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
function Session(conn) {
    Session.super_.call(this);
    this.connection = conn;
    this.remoteChannel = undefined;
    this._linksByName = {};
    this._linksByRemoteHandle = {};
    this._senderLinks = [];

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
}

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
    exceptions.assertArguments(sessionParams, ['nextOutgoingId', 'incomingWindow', 'outgoingWindow']);

    this.channel = this.connection.associateSession(this);
    this._sessionParams = sessionParams;
    this._initialOutgoingId = sessionParams.nextOutgoingId;

    this.sessionSM.sendBegin();
    var self = this;
    this._processFrameEH = function(frame) { self._processFrame(frame); };
    this.connection.on(Connection.FrameReceived, this._processFrameEH);
    var beginFrame = new BeginFrame(this._sessionParams);
    beginFrame.channel = this.channel;
    this.connection.sendFrame(beginFrame);
};

Session.prototype.attachLink = function(linkParams) {
    linkParams.handle = this._nextHandle();
    var newLink = new Link(this, linkParams.handle);
    this._linksByName[linkParams.name] = newLink;
    newLink.attach(linkParams);
    if (newLink.role === constants.linkRole.sender) {
        this._senderLinks.push(newLink);
    }
    return newLink;
};

/**
 *
 * @param {Link} link
 * @param {Message} message
 * @param {*} options
 */
Session.prototype.sendMessage = function(link, message, options) {
    var messageId = this._sessionParams.nextOutgoingId;
    this._sessionParams.nextOutgoingId++;
    this._sessionParams.remoteIncomingWindow--;
    this._sessionParams.outgoingWindow--;
    if (this._sessionParams.remoteIncomingWindow < 0) {
        throw new exceptions.OverCapacityError('Cannot send message - over Session window capacity');
    }

    link.sendMessage(messageId, message, options);
};

Session.prototype.detachLink = function(link) {
    link.detach();
};

Session.prototype.end = function() {
    if (this.remoteChannel !== undefined) {
        this.sessionSM.sendEnd();
        this._sendEnd();
        if (this.sessionSM.getMachineState() === 'UNMAPPED') this._unmap();
    } else {
        console.warn('Attempt to end session on channel ' + this.channel + ' before it is mapped.');
        this._unmap();
    }
};

Session.prototype._nextHandle = function() {
    for (var hid = 1; hid <= this._sessionParams.handleMax; ++hid) {
        if (this._linksByName[hid] === undefined) return hid;
    }
    throw new exceptions.OverCapacityError('Out of available handles (Max = ' + this._sessionParams.handleMax + ')');
};

Session.prototype._processFrame = function(frame) {
    debug('Processing frame '+frame.constructor.name+': '+JSON.stringify(frame));
    if (frame instanceof BeginFrame) {
        if (frame.remoteChannel === this.channel) {
            this.sessionSM.beginReceived();
            this._beginReceived(frame);
        }
    } else {
        if (frame.channel !== undefined && frame.channel === this.remoteChannel) {
            if (frame instanceof EndFrame) {
                this.sessionSM.endReceived();
                this._endReceived(frame);
                if (this.sessionSM.getMachineState() !== 'UNMAPPED') {
                    this.sessionSM.sendEnd();
                    this._sendEnd();
                }
                this._unmap();
            } else if (frame instanceof AttachFrame) {
                if (frame.name && this._linksByName[frame.name]) {
                    this._linksByName[frame.name].attachReceived(frame);
                } else {
                    // @todo Proper error reporting.  Should we shut down session?
                    console.warn('Received Attach for unknown link ' + frame.name + ': ' + JSON.stringify(frame));
                }
            } else if (frame instanceof DetachFrame) {
                if (frame.handle !== undefined && this._linksByRemoteHandle[frame.handle]) {
                    this._linksByRemoteHandle[frame.handle].detachReceived(frame);
                } else {
                    // @todo Proper error reporting.  Should we shut down session?
                    console.warn('Received Detach for unknown link ' + frame.handle + ': ' + JSON.stringify(frame));
                }
            } else if (frame instanceof FlowFrame) {
                this._flowReceived(frame);
                if (frame.handle !== null) {
                    if (this._linksByRemoteHandle[frame.handle]) {
                        this._linksByRemoteHandle[frame.handle].flowReceived(frame);
                    } else {
                        // @todo Proper error reporting.  Should we shut down session?
                        console.warn('Received Flow for unknown link ' + frame.handle + ': ' + JSON.stringify(frame));
                    }
                } else {
                    if (frame.linkCredit && frame.linkCredit > 0) {
                        if (this._senderLinks.length === 1) {
                            this._senderLinks[0].flowReceived(frame);
                        }
                    }
                }
            } else if (frame instanceof TransferFrame) {
                if (frame.handle !== null && this._linksByRemoteHandle[frame.handle]) {
                    this._transferReceived(frame);
                    this._linksByRemoteHandle[frame.handle].messageReceived(frame);
                } else {
                    console.warn('Received Transfer frame for unknown link ' + frame.handle + ': ' + JSON.stringify(frame));
                }
            } else {
                debug('Not yet processing frames of type ' + frame.constructor.name);
            }
        }
    }
};

Session.prototype._beginReceived = function(frame) {
    this.remoteChannel = frame.channel;
    this._sessionParams.nextIncomingId = frame.nextOutgoingId;
    this._sessionParams.remoteIncomingWindow = frame.incomingWindow;
    this._sessionParams.remoteOutgoingWindow = frame.outgoingWindow;
    this._sessionParams.handleMax = this._sessionParams.handleMax ?
        Math.min(this._sessionParams.handleMax, frame.handleMax || constants.defaultHandleMax)
        : (frame.handleMax || constants.defaultHandleMax);
    debug('On BEGIN_RCVD, setting params to ('+this._sessionParams.nextIncomingId+','+this._sessionParams.remoteIncomingWindow+','+
        this._sessionParams.remoteOutgoingWindow+','+this._sessionParams.handleMax+')');
    // @todo Cope with capabilities and properties
    this.emit(Session.Mapped);
};

Session.prototype._flowReceived = function(frame) {
    this._sessionParams.nextIncomingId = frame.nextOutgoingId;
    this._sessionParams.remoteOutgoingWindow = frame.outgoingWindow;
    if (frame.nextIncomingId === undefined || frame.nextIncomingId === null) {
        this._sessionParams.remoteIncomingWindow = this._initialOutgoingId +
            frame.incomingWindow - this._sessionParams.nextOutgoingId;
    } else {
        this._sessionParams.remoteIncomingWindow = frame.nextIncomingId +
            frame.incomingWindow + this._sessionParams.nextOutgoingId;
    }
};

Session.prototype._transferReceived = function(frame) {
    this._sessionParams.incomingWindow--;
    this._sessionParams.remoteOutgoingWindow--;

    if (this._sessionParams.incomingWindow < 0) {
        // @todo Shut down session since sender is not respecting window.
        debug('Transfer frame received when no incoming window remaining, should shut down session but for now being tolerant.');
    }

    if (frame.deliveryId !== undefined && frame.deliveryId !== null) {
        this._sessionParams.nextIncomingId = frame.deliveryId + 1;
    }
};

Session.prototype._endReceived = function(frame) {
    if (frame.error) {
        this.emit(Session.ErrorReceived, frame.error);
    }
};

Session.prototype._sendEnd = function(frame) {
    var endFrame = new EndFrame();
    endFrame.channel = this.channel;
    this.connection.sendFrame(endFrame);
};

Session.prototype._unmap = function() {
    if (this.connection !== undefined && this.channel !== undefined) {
        this.connection.removeListener(Connection.FrameReceived, this._processFrameEH);
        this.connection.dissociateSession(this.channel);
        this.remoteChannel = undefined;
        this.channel = undefined;
        this.emit(Session.Unmapped);
    }
};

function Link(session, handle) {
    this.session = session;
    this.handle = handle;
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
                return this.DETACHING;
            }
        },
        'DETACHING': {
            detachReceived: function() {
                return this.DETACHED;
            },
            detached: function() {
                return this.DETACHED;
            }
        }
    };

    this.linkSM = new StateMachine(stateMachine).bind(function(event, oldState, newState) {
        debugLink('Transitioning from '+oldState+' to '+newState+' due to '+event);
    });
}

util.inherits(Link, EventEmitter);

// On receipt of a message.  Message payload given as argument.
Link.MessageReceived = 'rxMessage';
// Since 'error' events are "special" in Node (as in halt-the-process special), using a custom event for errors
// we receive from the other endpoint.  Provides received AMQPError as an argument.
Link.ErrorReceived = 'rxError';
// On link credit changed.
Link.CreditChange = 'linkCredit';
// On completion of detach.
Link.Detached = 'detached';

Link.prototype.attach = function(linkParams) {
    this.linkParams = linkParams;
    this.linkSM.sendAttach();
    var attachFrame = new AttachFrame(linkParams);
    attachFrame.channel = this.session.channel;
    debugLink('Tx attach CH='+attachFrame.channel+', Handle='+attachFrame.handle);
    if (attachFrame.role === constants.linkRole.sender) {
        this.initialDeliveryCount = attachFrame.initialDeliveryCount;
        this.deliveryCount = attachFrame.deliveryCount;
    }
    this.role = attachFrame.role;
    this.linkCredit = 0;
    this.available = 0;
    this.drain = false;
    this.session.connection.sendFrame(attachFrame);
};

Link.prototype.detach = function() {
    this.linkSM.sendDetach();
    this._sendDetach();
};

Link.prototype.attachReceived = function(attachFrame) {
    this.linkSM.attachReceived();
    // process params.
    this.remoteHandle = attachFrame.handle;
    this.session._linksByRemoteHandle[this.remoteHandle] = this;
    debugLink('Rx attach CH=['+this.session.channel+'=>'+attachFrame.channel+'], Handle=['+this.handle+'=>'+attachFrame.handle+']');
    this.session.emit(Session.LinkAttached, this);
};

Link.prototype.flowReceived = function(flowFrame) {
    if (this.role === constants.linkRole.sender) {
        this.available = flowFrame.available;
        this.linkCredit = flowFrame.linkCredit;
        this.emit(Link.CreditChange, this.linkCredit);
    } else {
        this.drain = flowFrame.drain;
    }
};

Link.prototype.addCredits = function(credits, flowOptions) {
    if (this.role === constants.linkRole.sender) {
        throw new exceptions.InvalidStateError('Cannot add link credits as a sender');
    }
    var opts = flowOptions || {};
    opts.linkCredit = credits;
    throw new exceptions.NotImplementedError('TBD');
};

Link.prototype.messageReceived = function(transferFrame) {
    this.emit(Link.MessageReceived, transferFrame.message);
};

Link.prototype.sendMessage = function(messageId, message, transferOptions) {
    if (this.linkCredit <= 0) {
        throw new exceptions.OverCapacityError('Cannot send if no link credit.');
    }
    var opts= transferOptions || {};
    opts.handle = this.handle;
    opts.deliveryId = messageId;
    var transferFrame = new TransferFrame(opts);
    transferFrame.channel = this.session.channel;
    transferFrame.message = message;
    this.linkCredit--;
    this.session.connection.sendFrame(transferFrame);
};

Link.prototype.detachReceived = function(frame) {
    this.linkSM.detachReceived();
    if (this.linkSM.getMachineState() === 'DETACHING') this.linkSM.detached();
    this._detached();
};

Link.prototype._sendDetach = function() {
    var detachFrame = new DetachFrame(this.linkParams);
    detachFrame.channel = this.session.channel;
    this.session.connection.sendFrame(detachFrame);
};

Link.prototype._detached = function() {
    this.session._linksByName[this.linkParams.name] = undefined;
    if (this.remoteHandle !== undefined) {
        this.session._linksByRemoteHandle[this.remoteHandle] = undefined;
        this.remoteHandle = undefined;
    }
    this.emit(Link.Detached);
    this.session.emit(Session.LinkDetached, this);
};

module.exports.Session = Session;
module.exports.Link = Link;
