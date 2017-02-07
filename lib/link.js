'use strict';

var EventEmitter = require('events').EventEmitter,
    Promise = require('bluebird'),
    util = require('util'),

    StateMachine = require('stately.js'),

    debug = require('debug')('amqp10:link'),
    u = require('./utilities'),
    frames = require('./frames'),
    errors = require('./errors');

/**
 * @class
 * @extends EventEmitter
 * @fires Link#errorReceived
 * @fires Link#attached
 * @fires Link#detached
 */
function Link(session, handle, linkPolicy) {
  this.policy = linkPolicy;
  this.session = session;
  this.handle = handle;
  this.remote = { handle: undefined };
  this.deliveryCount = 0;

  this._onAttach = [];
  if (this.policy && this.policy.reattach) {
    this._timeouts = u.generateTimeouts(this.policy.reattach);
  }

  var self = this;
  var stateMachine = {
    'DETACHED': {
      sendAttach: function() { return this.ATTACHING; },
      reattach: function() { return this.REATTACHING; }
    },
    'ATTACHING': {
      attachReceived: function() { return this.ATTACHED; }
    },
    'REATTACHING': {
      attachReceived: function() { return this.ATTACHED; }
    },
    'ATTACHED': {
      sendDetach: function() { return this.DETACHING; },
      detachReceived: function(options) {
        self._sendDetach(options);
        return this.DETACHING;
      },
      forceDetach: function() { return this.DETACHED; }
    },
    'DETACHING': {
      detachReceived: function() { return this.DETACHED; },
      detached: function() { return this.DETACHED; }
    }
  };

  this.linkSM = new StateMachine(stateMachine).bind(function(event, oldState, newState) {
    debug(self.name + ':' + self.handle + ': Transitioning from ' + oldState + ' to ' + newState + ' due to ' + event);
  });
}

util.inherits(Link, EventEmitter);

/**
 * Error received event
 *
 * @event Link#errorReceived
 * @param {object} error the received error
 */
Link.ErrorReceived = 'errorReceived';

/**
 * Attached event
 *
 * @event Link#attached
 */
Link.Attached = 'attached';

/**
 * Detached event
 *
 * @event Link#detached
 */
Link.Detached = 'detached';

// public api

/**
 * Detach the link from the session
 *
 * @inner @memberof Link
 * @param {object} [options] detach frame options
 * @return {Promise}
 */
Link.prototype.detach = function(options) {
  var self = this;
  this._timeouts = undefined; // Disable any re-attachment policy.
  var detachPromise = new Promise(function(resolve, reject) {
    var onError = function(err) { reject(err); };
    self.once(Link.ErrorReceived, onError);
    self.once(Link.Detached, function(info) {
      self.removeListener(Link.ErrorReceived, onError);
      if (!!info.error) return reject(info.error);
      if (!info.closed) {
        if (!options || options.closed) {
          return reject('link not closed');
        }
      }
      resolve();
    });
  });

  this.linkSM.sendDetach();
  this._sendDetach(options);
  return detachPromise;
};

// private api
Link.prototype.state = function() {
  return this.linkSM.getMachineState().toLowerCase();
};

Link.prototype.attach = function() {
  this.linkSM.sendAttach();
  var attachFrame = new frames.AttachFrame(this.policy.attach);
  attachFrame.channel = this.session.channel;
  debug('attach CH=' + attachFrame.channel + ', Handle=' + attachFrame.handle);

  this.name = attachFrame.name;
  this.role = attachFrame.role;
  this.linkCredit = 0;
  this.available = 0;
  this.drain = false;
  this.session.connection.sendFrame(attachFrame);
};

///
/// Force link state to detached without sending detach message - usually due to forcible disconnect or unmap from above.
/// Important bit is that this should not trigger auto-reattach behavior as that'll happen with reconnect.
///
Link.prototype.forceDetach = function() {
  var state = this.state();
  if (state !== 'attached' && state !== 'attaching' && state !== 'reattaching') {
    return;
  }

  debug('force detach for ' + this.name + '. current state: ' + state);
  if (!!this._reattachTimer) clearTimeout(this._reattachTimer);
  this.linkSM.forceDetach();
  this.emit(Link.Detached, {
    closed: true,
    error: new errors.ProtocolError('amqp:link:detach-forced', 'detach-forced')
  });
};

Link.prototype._resolveAttachPromises = function(err, link) {
  while (this._onAttach.length) {
    var attachPromise = this._onAttach.shift();
    attachPromise(err, link);
  }
};

Link.prototype._attachReceived = function(attachFrame) {
  this.linkSM.attachReceived();

  // process params.
  this.remote.handle = attachFrame.handle;
  this.remote.attach = attachFrame;

  this.session._linksByRemoteHandle[this.remote.handle] = this;
  debug(this.name + ': attached CH=[' + this.session.channel + '=>' + attachFrame.channel + '], Handle=[' + this.handle + '=>' + attachFrame.handle + ']');

  this.emit(Link.Attached, this);
  this._resolveAttachPromises(null, this);

  this._checkCredit({ initial: true });
};

// default implementation does nothing
Link.prototype._checkCredit = function() {};
Link.prototype.flow = function(options) {
  options = options || {};
  var flowOptions = u.defaults(options, {
    channel: this.session.channel,
    handle: this.handle,
    linkCredit: this.linkCredit,
    nextIncomingId: this.session._sessionParams.nextIncomingId,
    incomingWindow: this.session._sessionParams.incomingWindow,
    nextOutgoingId: this.session._sessionParams.nextOutgoingId,
    outgoingWindow: this.session._sessionParams.outgoingWindow,
    available: this.available,
    deliveryCount: this.deliveryCount,
    drain: false
  });

  this.session.connection.sendFrame(new frames.FlowFrame(flowOptions));
};

Link.prototype._detachReceived = function(frame) {
  this.linkSM.detachReceived({closed: frame.closed});
  if (this.linkSM.getMachineState() === 'DETACHING') this.linkSM.detached();
  this._detached(frame);
};

Link.prototype._sendDetach = function(options) {
  options = options || {};
  var detachoptions = u.defaults(options, {
    handle: this.handle,
    channel: this.session.channel,
    closed: true,
    error: null
  });

  this.session.connection.sendFrame(new frames.DetachFrame(detachoptions));
};

Link.prototype._detached = function(frame) {
  if (frame && frame.error) {
    this.emit(Link.ErrorReceived, errors.wrapProtocolError(frame.error));
  }

  this.remote.detach = frame;
  if (this.remote.handle !== undefined) {
    delete this.session._linksByRemoteHandle[this.remote.handle];
    this.remote.handle = undefined;
  }

  this.emit(Link.Detached, { closed: frame.closed, error: errors.wrapProtocolError(frame.error) });
  this._resolveAttachPromises(frame.error ? frame.error : 'link closed');

  var self = this;
  if (!self.shouldReattach()) return;
  if (!self._timeouts.length) self._timeouts = u.generateTimeouts(self.policy.reattach);

  this.linkSM.reattach();
  this._reattachTimer = setTimeout(function() {
    self._attemptReattach();
  }, self._timeouts.shift());
};

Link.prototype.shouldReattach = function() {
  if (!this.session || !this._timeouts) return false;
  if (!this._timeouts.length && !this.policy.reattach.forever) return false;
  return true;
};

Link.prototype._attemptReattach = function() {
  debug('Attempting to reattach ' + this.name);
  this.attach();
};

module.exports = Link;
