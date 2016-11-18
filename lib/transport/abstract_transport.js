'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var errors = require('../errors');

var throwBecauseAbstract = function(methodName) {
  throw new errors.TransportError('Cannot use AbstractTransport. Subclass must implement ' + methodName);
};

var AbstractTransport = function () {
  if (this.constructor === AbstractTransport) {
    throwBecauseAbstract('constructor');
  }

  EventEmitter.call(this);
};

util.inherits(AbstractTransport, EventEmitter);

AbstractTransport.register = function (client) {
  throwBecauseAbstract('register');
};

AbstractTransport.prototype.connect = function (address) {
  throwBecauseAbstract('connect');
};

AbstractTransport.prototype.write = function (data, callback) {
  throwBecauseAbstract('write');
};

AbstractTransport.prototype.end = function() {
  throwBecauseAbstract('end');
};

AbstractTransport.prototype.destroy = function() {
  throwBecauseAbstract('destroy');
};

module.exports = AbstractTransport;
