'use strict';

var EventEmitter = require('events').EventEmitter,
    util = require('util'),

    StateMachine = require('stately.js'),

    debug = require('debug')('amqp10:session'),

    frames = require('./frames'),
    constants = require('./constants'),
    errors = require('./errors'),
    u = require('./utilities'),

    Link = require('./link'),
    SenderLink = require('./sender_link'),
    ReceiverLink = require('./receiver_link'),
    Connection = require('./connection');



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
  this.setMaxListeners(100);
  this.connection = conn;
  this.mapped = false;
  this.remoteChannel = undefined;
  this._allocatedHandles = {};
  this._deliveryTag = 1;

  this._senderLinks = {};
  this._receiverLinks = {};

  this._linksByRemoteHandle = {};

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
    debug('Transitioning from ' + oldState + ' to ' + newState + ' due to ' + event);
  });
}

util.inherits(Session, EventEmitter);

// Events
Session.Mapped = 'mapped';
Session.Unmapped = 'unmapped';

// Since 'error' events are "special" in Node (as in halt-the-process special),
// using a custom event for errors we receive from the other endpoint. Provides
// received AMQPError as an argument.
Session.ErrorReceived = 'errorReceived';

// On receipt of a disposition frame, called with the first and last
// delivery-ids involved, whether they were settled, and the state.
Session.DispositionReceived = 'disposition';

Session.prototype.begin = function(sessionPolicy) {
  var sessionParams = u.deepCopy(sessionPolicy.options);
  u.assertArguments(sessionParams, ['nextOutgoingId', 'incomingWindow', 'outgoingWindow']);

  this.policy = sessionPolicy;
  this.channel = this.connection.associateSession(this);
  this._sessionParams = sessionParams;
  this._initialOutgoingId = sessionParams.nextOutgoingId;

  this.sessionSM.sendBegin();
  var self = this;
  this._processFrameEH = function(frame) { self._processFrame(frame); };
  this.connection.on(Connection.FrameReceived, this._processFrameEH);
  this.connection.on(Connection.Disconnected, this._resetLinkState);

  var beginFrame = new frames.BeginFrame(this._sessionParams);
  beginFrame.channel = this.channel;
  this.connection.sendFrame(beginFrame);
};

Session.prototype.createLink = function(linkPolicy) {
  var policy = u.deepCopy(linkPolicy),
      attachOptions = policy.attach || {};

  attachOptions.handle = this._nextHandle();
  if (typeof attachOptions.name === 'function')
    attachOptions.name = attachOptions.name();

  var link;
  if (attachOptions.role === constants.linkRole.sender) {
    link = new SenderLink(this, attachOptions.handle, policy);
    this._senderLinks[attachOptions.name] = link;
  } else {
    link = new ReceiverLink(this, attachOptions.handle, policy);
    this._receiverLinks[attachOptions.name] = link;
  }

  this._allocatedHandles[attachOptions.handle] = link;

  var self = this;
  link.on(Link.Detached, function(details) {
    debug('detached(' + this.name + '): ' + (details ? details.error : 'No details'));
    if (!this.shouldReattach()) self._removeLink(this);
  });

  link.on(Link.ErrorReceived, function(err) {
    self.emit(Session.ErrorReceived, err);
  });

  if (this.mapped) {
    // immediately attempt to attach link
    link.attach();
  }

  return link;
};

///
/// Remove a link from the session
///
Session.prototype._removeLink = function(link) {
  delete this._allocatedHandles[link.handle];
  if (link instanceof SenderLink) {
    debug('removing sender link ' + link.name);
    delete this._senderLinks[link.name];
  } else {
    debug('removing receiver link ' + link.name);
    delete this._receiverLinks[link.name];
  }
};

Session.prototype.addWindow = function(windowSize, flowOptions) {
  var opts = flowOptions || {};
  this._sessionParams.incomingWindow += windowSize;
  opts.nextIncomingId = this._sessionParams.nextIncomingId;
  opts.incomingWindow = this._sessionParams.incomingWindow;
  opts.nextOutgoingId = this._sessionParams.nextOutgoingId;
  opts.outgoingWindow = this._sessionParams.outgoingWindow;
  opts.handle = null;
  opts.available = null;
  opts.deliveryCount = null;
  opts.drain = false;

  var flow = new frames.FlowFrame(opts);
  flow.channel = this.channel;
  this.connection.sendFrame(flow);
};

Session.prototype.detachLink = function(link) {
  return link.detach();
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
  for (var hid = 0; hid <= this._sessionParams.handleMax; ++hid) {
    if (this._allocatedHandles[hid] === undefined) {
      this._allocatedHandles[hid] = true; // Will be replaced by link itself.
      return hid;
    }
  }
  throw new errors.OverCapacityError('Out of available handles (Max = ' + this._sessionParams.handleMax + ')');
};

Session.prototype._processFrame = function(frame) {
  if (frame instanceof frames.BeginFrame && (frame.remoteChannel === this.channel)) {
    this.sessionSM.beginReceived();
    this._beginReceived(frame);
    return;
  }

  if (frame.channel === undefined || frame.channel !== this.remoteChannel) {
    debug('invalid frame: ', frame);
    return;
  }

  if (frame instanceof frames.EndFrame) return this._processEndFrame(frame);
  else if (frame instanceof frames.AttachFrame) return this._processAttachFrame(frame);
  else if (frame instanceof frames.DetachFrame) return this._processDetachFrame(frame);
  else if (frame instanceof frames.FlowFrame) return this._processFlowFrame(frame);
  else if (frame instanceof frames.TransferFrame) return this._processTransferFrame(frame);
  else if (frame instanceof frames.DispositionFrame) return this._processDispositionFrame(frame);

  // else
  debug('not yet processing frame type: ', frame);
};

Session.prototype._processEndFrame = function(frame) {
  this.sessionSM.endReceived();
  this._endReceived(frame);
  if (this.sessionSM.getMachineState() !== 'UNMAPPED') {
    this.sessionSM.sendEnd();
    this._sendEnd();
  }

  this._unmap();
};

Session.prototype._processAttachFrame = function(frame) {
  var links =
    (frame.role === constants.linkRole.sender) ? this._receiverLinks : this._senderLinks;
  if (frame.name && links[frame.name]) {
    links[frame.name]._attachReceived(frame);
  } else {
    // @todo: Proper error reporting.  Should we shut down session?
    console.warn('received Attach for unknown link(' + frame.name + '): ' + JSON.stringify(frame));
  }
};

Session.prototype._processDetachFrame = function(frame) {
  if (frame.handle !== undefined && this._linksByRemoteHandle[frame.handle]) {
    this._linksByRemoteHandle[frame.handle]._detachReceived(frame);
  } else {
    // @todo: Proper error reporting.  Should we shut down session?
    console.warn('received Detach for unknown link(' + frame.handle + '): ' + JSON.stringify(frame));
  }
};

Session.prototype._processFlowFrame = function(frame) {
  this._flowReceived(frame);
  if (frame.handle !== null) {
    if (this._linksByRemoteHandle[frame.handle]) {
      this._linksByRemoteHandle[frame.handle]._flowReceived(frame);
    }
  } else {
    u.values(this._senderLinks).forEach(function (senderLink) {
      senderLink._flowReceived(frame);
    });
  }
};

Session.prototype._processTransferFrame = function(frame) {
  if (frame.handle !== null && this._linksByRemoteHandle[frame.handle]) {
    this._transferReceived(frame);
    this._linksByRemoteHandle[frame.handle]._messageReceived(frame);
  } else {
    console.warn('received Transfer frame for unknown link(' + frame.handle + '): ' + JSON.stringify(frame));
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
  debug('On BEGIN_RCVD, setting params to (' + this._sessionParams.nextIncomingId + ',' + this._sessionParams.remoteIncomingWindow + ',' +
        this._sessionParams.remoteOutgoingWindow + ',' + this._sessionParams.handleMax + ')');
  // @todo: Cope with capabilities and properties
  this.mapped = true;
  this._deliveryTag = 1;
  this.emit(Session.Mapped, this);

  // attach all links
  var attachHandler = function(l) {
    debug('Attaching link ' + l.name + ':' + l.handle + ' after begin received');
    if (l.state() !== 'attached' && l.state() !== 'attaching') l.attach();
  };
  u.values(this._senderLinks).forEach(attachHandler);
  u.values(this._receiverLinks).forEach(attachHandler);
};

Session.prototype._flowReceived = function(frame) {
  this._sessionParams.nextIncomingId = frame.nextOutgoingId;
  this._sessionParams.remoteOutgoingWindow = frame.outgoingWindow;
  if (frame.nextIncomingId === undefined || frame.nextIncomingId === null) {
    this._sessionParams.remoteIncomingWindow = this._initialOutgoingId +
            frame.incomingWindow - this._sessionParams.nextOutgoingId;
    debug('New Incoming Window (no known id): ' + this._sessionParams.remoteIncomingWindow + ' = ' +
            this._initialOutgoingId + ' + ' + frame.incomingWindow + ' - ' + this._sessionParams.nextOutgoingId);
  } else {
    this._sessionParams.remoteIncomingWindow = frame.nextIncomingId +
            frame.incomingWindow - this._sessionParams.nextOutgoingId;
    debug('New Incoming Window (known id): ' + this._sessionParams.remoteIncomingWindow + ' = ' +
        frame.nextIncomingId + ' + ' + frame.incomingWindow + ' - ' + this._sessionParams.nextOutgoingId);
  }
};

Session.prototype._transferReceived = function(frame) {
  this._sessionParams.incomingWindow--;
  this._sessionParams.remoteOutgoingWindow--;

  if (this._sessionParams.incomingWindow < 0) {
    // @todo: Shut down session since sender is not respecting window.
    console.warn('Transfer frame received when no incoming window remaining, should shut down session but for now being tolerant.');
  }

  if (frame.deliveryId !== undefined && frame.deliveryId !== null) {
    this._sessionParams.nextIncomingId = frame.deliveryId + 1;
  }
};

Session.prototype._endReceived = function(frame) {
  if (frame.error) {
    this.emit(Session.ErrorReceived, errors.wrapProtocolError(frame.error));
  }
};

Session.prototype._sendEnd = function(frame) {
  var endFrame = new frames.EndFrame();
  endFrame.channel = this.channel;
  this.connection.sendFrame(endFrame);
};

Session.prototype._unmap = function() {
  if (this.connection !== undefined && this.channel !== undefined) {
    this.connection.removeListener(Connection.FrameReceived, this._processFrameEH);
    this.connection.dissociateSession(this.channel);
    this.connection = undefined;
    this.remoteChannel = undefined;
    this.channel = undefined;
    this.mapped = false;

    debug('Session unmapped - force-detaching all links.');
    // force-detach all links (they've already been detached due to unmap, just need to let them know about it)
    var detachHandler = function(l) { l.forceDetach(); };
    u.values(this._senderLinks).forEach(detachHandler);
    u.values(this._receiverLinks).forEach(detachHandler);
    this._linksByRemoteHandle = {};
    this._allocatedHandles = {};

    this.emit(Session.Unmapped);
  }
};

Session.prototype._processDispositionFrame = function(frame) {
  var disposition = {
    first: frame.first,
    last: frame.last || frame.first,
    settled: frame.settled,
    state: frame.state
  };

  var dispositionHandler = function(l) { l._dispositionReceived(disposition); };
  if (frame.role === constants.linkRole.sender) {
    u.values(this._receiverLinks).forEach(dispositionHandler);
  } else {
    u.values(this._senderLinks).forEach(dispositionHandler);
  }

  this.emit(Session.DispositionReceived, disposition);
};

/**
 * INTERNAL
 * Resets the state of all known links for this session.
 */
Session.prototype._resetLinkState = function() {
  var forceDetachLink = function(l) { l.forceDetach(); };
  u.values(this._senderLinks).forEach(forceDetachLink);
  u.values(this._receiverLinks).forEach(forceDetachLink);
};

module.exports = Session;
