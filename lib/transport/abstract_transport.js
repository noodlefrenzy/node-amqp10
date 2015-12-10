'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var throwBecauseAbstract = function(methodName) {
	throw new Error('Cannot use AbstractTransport. Subclass must implement ' + methodName);	
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

AbstractTransport.prototype.write = function (data) {
	throwBecauseAbstract('write');
};

AbstractTransport.prototype.end = function() {
	throwBecauseAbstract('end');
};

AbstractTransport.prototype.destroy = function() {
	throwBecauseAbstract('destroy');
};

module.exports = AbstractTransport; 
