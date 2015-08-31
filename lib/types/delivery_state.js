'use strict';

var Int64 = require('node-int64'),
    util = require('util'),

    constants = require('../constants'),
    errors = require('../errors'),
    u = require('../utilities'),

    AMQPError = require('./amqp_error'),
    DescribedType = require('./described_type'),
    ForcedType = require('./forced_type'),
    AMQPSymbol = require('./amqp_symbol'),
    AMQPFields = require('./amqp_composites').Fields;

/**
 * Delivery state base class
 */
function DeliveryState(code) {
  DeliveryState.super_.call(this, code);
}

util.inherits(DeliveryState, DescribedType);

/**
 * Received
 * The received outcome
 *
 * @param sectionNumber
 * @param sectionOffset
 */
function Received(options) {
  Received.super_.call(this, Received);
  u.assertArguments(options, ['sectionNumber', 'sectionOffset']);
  this.sectionNumber = options.sectionNumber;
  this.sectionOffset = options.sectionOffset;
}

util.inherits(Received, DeliveryState);

Received.fromDescribedType = function(describedType) {
  var options = {
    sectionNumber: describedType.value[0],
    sectionOffset: describedType.value[1]
  };
  return new Received(options);
};

Received.prototype.getValue = function() {
  var self = this;
  return [
    new ForcedType('uint', self.sectionNumber),
    new ForcedType('ulong', self.sectionOffset)];
};

Received.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:received:list'),
  code: new Int64(0x0, 0x23)
};

/**
 * Accepted
 * The accepted state
 */
function Accepted(options) {
  Accepted.super_.call(this, Accepted);
}

util.inherits(Accepted, DeliveryState);

Accepted.fromDescribedType = function(describedType) {
  return new Accepted();
};

Accepted.prototype.getValue = function() {
  return undefined; // Accepted has no fields
};

Accepted.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:accepted:list'),
  code: new Int64(0x0, 0x24)
};

/**
 * Reject
 * The rejected state
 *
 * @param error
 */
function Rejected(options) {
  Rejected.super_.call(this, Rejected);

  options = options || {};
  if (options instanceof AMQPError) {
    this.error = options;
  } else {
    // @todo: qpid sends back no error, what should this message be?
    this.error = options.error || "rejected";
  }
}

util.inherits(Rejected, DeliveryState);

Rejected.fromDescribedType = function(describedType) {
  return new Rejected(describedType.value ? describedType.value[0] : null);
};

Rejected.prototype.getValue = function() {
  return [this.error || null];
};

Rejected.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:rejected:list'),
  code: new Int64(0x0, 0x25)
};

/**
 * Released
 * The released outcome.
 */
function Released(options) {
  Released.super_.call(this, Released);
}

util.inherits(Released, DeliveryState);

Released.fromDescribedType = function(describedType) {
  return new Released();
};

Released.prototype.getValue = function() {
  return undefined; // Released has no fields
};

Released.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:released:list'),
  code: new Int64(0x0, 0x26)
};

/**
 * Modified
 * The modified outcome
 *
 * @param deliveryFailed
 * @param undeliverableHere
 * @param messageAnnotations
 */
function Modified(options) {
  Modified.super_.call(this, Modified);
  u.assertArguments(options, ['deliveryFailed', 'undeliverableHere', 'messageAnnotations']);
  this.deliveryFailed = options.deliveryFailed;
  this.undeliverableHere = options.undeliverableHere;
  this.messageAnnotations = options.messageAnnotations;
}

util.inherits(Modified, DeliveryState);

Modified.fromDescribedType = function(describedType) {
  var options = {
    deliveryFailed: describedType.value[0],
    undeliverableHere: describedType.value[1],
    messageAnnotations: describedType.value[2]
  };

  return new Modified(options);
};

Modified.prototype.getValue = function() {
  var self = this;
  return [
    new ForcedType('bool', self.deliveryFailed),
    new ForcedType('bool', self.undeliverableHere),
    new AMQPFields(self.messageAnnotations)
  ];
};

Modified.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:modified:list'),
  code: new Int64(0x0, 0x27)
};

module.exports = {
  DeliveryState: DeliveryState,
  Received: Received,
  Accepted: Accepted,
  Rejected: Rejected,
  Released: Released,
  Modified: Modified
};
