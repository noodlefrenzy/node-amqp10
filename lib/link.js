'use strict';

var EventEmitter = require('events').EventEmitter,
    Promise = require('bluebird'),
    util = require('util'),

    StateMachine = require('stately.js'),

    debug = require('debug')('amqp10:link'),
    u = require('./utilities'),
    pu = require('./policies/policy_utilities'),
    frames = require('./frames'),
    errors = require('./errors');

var stateMachine = function(link) {
  var detachHandler = function(frame) {
    if (this.getMachineState() === 'ATTACHED') {
      this.ATTACHED.sendDetach({ closed: frame.closed });
    }

    link._detached(frame);
    return this.DETACHED;
  };

  var states = {
    'DETACHED': {
      sendAttach: 'ATTACHING',
      reattach: 'REATTACHING'
    },
    'ATTACHING': { attachReceived: 'ATTACHED' },
    'REATTACHING': { attachReceived: 'ATTACHED' },
    'ATTACHED': {
      sendDetach: function(options) {
        link._sendDetach(options);
        return this.DETACHING;
      },
    },
    'DETACHING': { detached: 'DETACHED' }
  };

  Object.keys(states).forEach(function(s) {
    states[s].forceDetach = 'DETACHED';
    states[s].detachReceived = detachHandler;
  });

  return states;
};


/**
 * @class
 * @extends EventEmitter
 * @fires Link#errorReceived
 * @fires Link#attached
 * @fires Link#detached
 */
function Link(session, handle, linkPolicy) {
  this.policy = linkPolicy;
  pu.fixDeprecatedLinkOptions(this.policy);

  this.session = session;
  this.handle = handle;
  this.remote = { handle: undefined };
  this.deliveryCount = 0;

  this._onAttach = [];
  if (this.policy && this.policy.reattach) {
    this._timeouts = u.generateTimeouts(this.policy.reattach);
  }

  var self = this;
  this.sm = new StateMachine(stateMachine(this));
  this.sm.bind(function(event, oldState, newState) {
    debug('stateChange(' + self.id + '):', oldState, '=>', newState, ', reason:', event);
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

  this.sm.sendDetach(options);
  return detachPromise;
};

// private api
Link.prototype.state = function() {
  return this.sm.getMachineState().toLowerCase();
};

Object.defineProperty(Link.prototype, 'id', {
  get: function() { return this.name + ':' + this.handle; }
});

Link.prototype.attach = function() {
  this.sm.sendAttach();
  var attachFrame = new frames.AttachFrame(this.policy.attach);
  attachFrame.channel = this.session.channel;

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

  debug('forceDetach(' + this.id + '): current state:', state);
  if (!!this._reattachTimer) clearTimeout(this._reattachTimer);
  this.sm.forceDetach();
  this.emit(Link.Detached, {
    closed: true,
    error: new errors.ProtocolError('amqp:link:detach-forced', 'detach-forced')
  });
};

Link.prototype._resolveAttachPromises = function(err, link) {
  for (var i = 0; i < this._onAttach.length; ++i) {
    var attachPromise = this._onAttach[i];
    attachPromise(err, link);
  }

  this._onAttach = [];
};

Link.prototype._attachReceived = function(attachFrame) {
  this.sm.attachReceived();

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
  this.sm.detached();

  // now check for whether we should reattach
  var self = this;
  if (self.shouldReattach()) {
    process.nextTick(function() { self._attemptReattach(); });
  }
};

Link.prototype.shouldReattach = function() {
  if (this.session && !this.session.mapped) return false;
  if (!this.session || !this._timeouts) return false;
  if (!this._timeouts.length && !this.policy.reattach.forever) return false;
  return true;
};

Link.prototype._attemptReattach = function() {
  var self = this;
  if (!self._timeouts.length) {
    self._timeouts = u.generateTimeouts(self.policy.reattach);
  }

  self.sm.reattach();
  self._reattachTimer = setTimeout(function() {
    if (self.shouldReattach()) {
      debug('attempting to reattach: ' + self.id);
      self.attach();
    } else {
      process.nextTick(function() { self._attemptReattach(); });
    }
  }, self._timeouts.shift());
};

module.exports = Link;
