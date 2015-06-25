'use strict';

var _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    Promise = require('bluebird'),
    util = require('util'),

    StateMachine = require('stately.js'),

    debug = require('debug')('amqp10:link'),

    constants = require('./constants'),
    errors = require('./errors'),
    u = require('./utilities'),

    AttachFrame = require('./frames/attach_frame'),
    DetachFrame = require('./frames/detach_frame'),
    FlowFrame = require('./frames/flow_frame'),
    TransferFrame = require('./frames/transfer_frame'),
    DispositionFrame = require('./frames/disposition_frame'),

    DeliveryState = require('./types/delivery_state'),
    Session = require('./session');

function Link(session, handle, linkPolicy) {
  this.policy = linkPolicy;
  this.session = session;
  this.handle = handle;
  this.attached = false;
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
    debug('Transitioning from ' + oldState + ' to ' + newState + ' due to ' + event);
  });
}

util.inherits(Link, EventEmitter);

// On receipt of a message.  Message payload given as argument.
Link.MessageReceived = 'link:messageReceived';

// Since 'error' events are "special" in Node (as in halt-the-process special),
// using a custom event for errors we receive from the other endpoint. Provides
// received AMQPError as an argument.
Link.ErrorReceived = 'link:errorReceived';

// On link credit changed.
Link.CreditChange = 'link:creditChange';

// On completion of detach.
Link.Detached = 'link:detached';

// public api
Link.prototype.attach = function() {
  this.linkSM.sendAttach();
  var attachFrame = new AttachFrame(this.policy.options);
  attachFrame.channel = this.session.channel;
  debug('Tx attach CH=' + attachFrame.channel + ', Handle=' + attachFrame.handle);
  if (attachFrame.role === constants.linkRole.sender) {
    this.initialDeliveryCount = attachFrame.initialDeliveryCount;
    this.deliveryCount = attachFrame.deliveryCount;
  }

  this.name = attachFrame.name;
  this.role = attachFrame.role;
  this.linkCredit = 0;
  this.totalCredits = 0;
  this.available = 0;
  this.drain = false;
  this.session.connection.sendFrame(attachFrame);
};

Link.prototype.detach = function() {
  var self = this;
  var detachPromise = new Promise(function(resolve, reject) {
    var onError = function(err) { reject(err); };
    self.once(Link.ErrorReceived, onError);
    self.once(Link.Detached, function(info) {
      self.removeListener(Link.ErrorReceived, onError);
      if (!!info.error) return reject(info.error);
      if (!info.closed) return reject('link not closed');
      resolve();
    });
  });

  this.linkSM.sendDetach();
  this._sendDetach();
  return detachPromise;
};

// private api
Link.prototype._attachReceived = function(attachFrame) {
  this.linkSM.attachReceived();
  // process params.
  this.remoteHandle = attachFrame.handle;
  this.session._linksByRemoteHandle[this.remoteHandle] = this;
  if (this.role === constants.linkRole.receiver) {
    this.deliveryCount = attachFrame.deliveryCount;
  }
  debug('Rx attach CH=[' + this.session.channel + '=>' + attachFrame.channel + '], Handle=[' + this.handle + '=>' + attachFrame.handle + ']');
  this.attached = true;

  // @todo: Session should listen for Link.Attached
  this.session._linkAttached(this);

  this._checkCredit();
};

// default implementation does nothing
Link.prototype._checkCredit = function() {};

Link.prototype._detachReceived = function(frame) {
  this.linkSM.detachReceived();
  if (this.linkSM.getMachineState() === 'DETACHING') this.linkSM.detached();
  this._detached(frame);
};

Link.prototype._sendDetach = function() {
  var detachFrame = new DetachFrame(this.policy.options);
  detachFrame.channel = this.session.channel;
  detachFrame.closed = true;
  this.session.connection.sendFrame(detachFrame);
};

Link.prototype._detached = function(frame) {
  if (frame && frame.error) {
    this.emit(Link.ErrorReceived, frame.error);
  }

  if (this.remoteHandle !== undefined) {
    this.session._linksByRemoteHandle[this.remoteHandle] = undefined;
    this.remoteHandle = undefined;
  }

  this.session._linksByName[this.policy.options.name] = undefined;
  this.session._allocatedHandles[this.policy.options.handle] = undefined;
  this.attached = false;
  this.emit(Link.Detached, { closed: frame.closed, error: frame.error });

  // @todo: Session should listen for Link.Detached
  this.session._linkDetached(this);
};

module.exports = Link;
