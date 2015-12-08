'use strict';

var util = require("util");
var EventEmitter = require('events');

var AbstractTransport = function () {
	if (this.constructor === AbstractTransport) {
		throwBecauseAbstract();
	}
	
	EventEmitter.call(this);
};

util.inherits(AbstractTransport, EventEmitter);

AbstractTransport.prototype.register = function (client) {
	throwBecauseAbstract();
};

AbstractTransport.prototype.connect = function (address) {
	throwBecauseAbstract();
};

AbstractTransport.prototype.write = function (data) {
	throwBecauseAbstract();
};

AbstractTransport.prototype.end = function() {
	throwBecauseAbstract();
};

AbstractTransport.prototype.destroy = function() {
	throwBecauseAbstract();
};

var throwBecauseAbstract = function() {
	throw new Error('Cannot use AbstractTransport. Please use a concrete implementation instead.');	
}

module.exports = AbstractTransport; 
