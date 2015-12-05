'use strict';

var util = require("util");
var EventEmitter = require('events');
var net = require('net');
var debug = require('debug')('amqp10:connection:basicsocketclient');

function BasicSocketClient() {
	EventEmitter.call(this);
	this._client = null;
}

util.inherits(BasicSocketClient, EventEmitter);

BasicSocketClient.prototype.connect = function (address) {
		debug('Connecting to ' + address.host + ':' + address.port + ' via straight-up sockets');
		this._client = net.connect({ port: address.port, host: address.host });
		
		this._client.on('connect', function() { this.emit('connect'); }.bind(this));
		this._client.on('data', function(data) { this.emit('data', data); }.bind(this));
		this._client.on('error', function(err) { this.emit('error', err); }.bind(this));
		this._client.on('end', function() { this.emit('end'); }.bind(this));
};

BasicSocketClient.prototype.write = function (data) {
	if(this._client) {
		this._client.write(data);
	} else {
		throw new Error('Socket not connected');
	}
};

BasicSocketClient.prototype.end = function() {
	if (this._client) {
		this._client.end();
	} else {
		throw new Error('Socket not connected');
	}
};

BasicSocketClient.prototype.destroy = function() {
	if (this._client) {
		this._client.destroy();
		this._client = null;
		this.removeAllListeners();
	} else {
		throw new Error('Socket not connected');
	}
};

module.exports = BasicSocketClient;