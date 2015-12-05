'use strict';

var util = require("util");
var EventEmitter = require('events');
var tls = require('tls');
var debug = require('debug')('amqp10:connection:tlssocketclient');

function TlsSocketClient() {
	EventEmitter.call(this);
	this._client = null;
}

util.inherits(TlsSocketClient, EventEmitter);

TlsSocketClient.prototype.connect = function (address, sslOpts) {
	var sslOptions = sslOpts || {};
	sslOptions.port = address.port;
	sslOptions.host = address.host;
	this._client = tls.connect(sslOptions);
	debug('Connecting to ' + address.host + ':' + address.port + ' via TLS');
	
	this._client.on('secureConnect', function() { this.emit('connect'); }.bind(this));
	this._client.on('data', function(data) { this.emit('data', data); }.bind(this));
	this._client.on('error', function(err) { this.emit('error', err); }.bind(this));
	this._client.on('end', function() { this.emit('end'); }.bind(this));
};

TlsSocketClient.prototype.write = function (data) {
	if(this._client) {
		this._client.write(data);
	} else {
		throw new Error('Socket not connected');
	}
};

TlsSocketClient.prototype.end = function() {
	if (this._client) {
		this._client.end();
	} else {
		throw new Error('Socket not connected');
	}
};

TlsSocketClient.prototype.destroy = function() {
	if (this._client) {
		this._client.destroy();
		this._client = null;
		this.removeAllListeners();
	} else {
		throw new Error('Socket not connected');
	}
};

module.exports = TlsSocketClient;