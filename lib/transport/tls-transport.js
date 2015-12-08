'use strict';

var AbstractTransport = require('./abstract-transport.js');
var tls = require('tls');
var debug = require('debug')('amqp10:connection:tlstransport');

var TlsTransport = function() {
	AbstractTransport.call(this);
	this._transport = null;
};

TlsTransport.prototype = Object.create(AbstractTransport.prototype);
TlsTransport.prototype.constructor = TlsTransport;

TlsTransport.prototype.register = function (client) {
	client.registerProtocolHandler('amqps', this);
};

TlsTransport.prototype.connect = function (address, sslOpts) {
	var sslOptions = sslOpts || {};
	sslOptions.port = address.port;
	sslOptions.host = address.host;
	this._transport = tls.connect(sslOptions);
	debug('Connecting to ' + address.host + ':' + address.port + ' via TLS');
	
	this._transport.on('secureConnect', function() { this.emit('connect'); }.bind(this));
	this._transport.on('data', function(data) { this.emit('data', data); }.bind(this));
	this._transport.on('error', function(err) { this.emit('error', err); }.bind(this));
	this._transport.on('end', function() { this.emit('end'); }.bind(this));
};

TlsTransport.prototype.write = function (data) {
	if(this._transport) {
		this._transport.write(data);
	} else {
		throw new Error('Socket not connected');
	}
};

TlsTransport.prototype.end = function() {
	if (this._transport) {
		this._transport.end();
	} else {
		throw new Error('Socket not connected');
	}
};

TlsTransport.prototype.destroy = function() {
	if (this._transport) {
		this._transport.destroy();
		this._transport = null;
		this.removeAllListeners();
	} else {
		throw new Error('Socket not connected');
	}
};

module.exports = TlsTransport; 
