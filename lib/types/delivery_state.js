'use strict';

var util = require('util'),

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

Received.prototype.Descriptor = { code: 0x23, name: new AMQPSymbol('amqp:received:list') };
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


/**
 * Accepted
 * The accepted state
 */
function Accepted(options) {
  Accepted.super_.call(this, Accepted);
}

util.inherits(Accepted, DeliveryState);

Accepted.prototype.Descriptor = { code: 0x24, name: new AMQPSymbol('amqp:accepted:list') };
Accepted.fromDescribedType = function(describedType) {
  return new Accepted();
};

Accepted.prototype.getValue = function() {
  return undefined; // Accepted has no fields
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

Rejected.prototype.Descriptor = { code: 0x25, name: new AMQPSymbol('amqp:rejected:list') };
Rejected.fromDescribedType = function(describedType) {
  return new Rejected(describedType.value ? describedType.value[0] : null);
};

Rejected.prototype.getValue = function() {
  return [this.error || null];
};

/**
 * Released
 * The released outcome.
 */
function Released(options) {
  Released.super_.call(this, Released);
}

util.inherits(Released, DeliveryState);

Released.prototype.Descriptor = { code: 0x26, name: new AMQPSymbol('amqp:released:list') };
Released.fromDescribedType = function(describedType) {
  return new Released();
};

Released.prototype.getValue = function() {
  return undefined; // Released has no fields
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

Modified.prototype.Descriptor = { code: 0x27, name: new AMQPSymbol('amqp:modified:list') };
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
    new ForcedType('boolean', self.deliveryFailed),
    new ForcedType('boolean', self.undeliverableHere),
    new AMQPFields(self.messageAnnotations)
  ];
};

module.exports = {
  DeliveryState: DeliveryState,
  Received: Received,
  Accepted: Accepted,
  Rejected: Rejected,
  Released: Released,
  Modified: Modified
};
