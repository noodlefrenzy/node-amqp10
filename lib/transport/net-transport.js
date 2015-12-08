'use strict';

var AbstractTransport = require('./abstract-transport.js');
var net = require('net');
var debug = require('debug')('amqp10:connection:nettransport');

var NetTransport = function () {
	AbstractTransport.call(this);
	this._transport = null;
};

NetTransport.prototype = Object.create(AbstractTransport.prototype);
NetTransport.prototype.constructor = NetTransport;

NetTransport.prototype.register = function (client) {
	client.registerProtocolHandler('amqp', this);
};

NetTransport.prototype.connect = function (address) {
		debug('Connecting to ' + address.host + ':' + address.port + ' via straight-up sockets');
		this._transport = net.connect({ port: address.port, host: address.host });
		
		this._transport.on('connect', function() { this.emit('connect'); }.bind(this));
		this._transport.on('data', function(data) { this.emit('data', data); }.bind(this));
		this._transport.on('error', function(err) { this.emit('error', err); }.bind(this));
		this._transport.on('end', function() { this.emit('end'); }.bind(this));
};

NetTransport.prototype.write = function (data) {
	if(this._transport) {
		this._transport.write(data);
	} else {
		throw new Error('Socket not connected');
	}
};

NetTransport.prototype.end = function() {
	if (this._transport) {
		this._transport.end();
	} else {
		throw new Error('Socket not connected');
	}
};

NetTransport.prototype.destroy = function() {
	if (this._transport) {
		this._transport.destroy();
		this._transport = null;
		this.removeAllListeners();
	} else {
		throw new Error('Socket not connected');
	}
};

module.exports = NetTransport; 
