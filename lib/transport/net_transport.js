'use strict';

var AbstractTransport = require('./abstract_transport.js');
var util = require('util');
var net = require('net');
var debug = require('debug')('amqp10:transport:net');

var NetTransport = function () {
	AbstractTransport.call(this);
	this._socket = null;
};

util.inherits(NetTransport, AbstractTransport);

NetTransport.register = function (transportProvider) {
	transportProvider.registerTransport('amqp', function () { return new NetTransport(); });
};

NetTransport.prototype.connect = function (address) {
		debug('Connecting to ' + address.host + ':' + address.port + ' via straight-up sockets');
		this._socket = net.connect({ port: address.port, host: address.host });
		
		var self = this;
		this._socket.on('connect', function() { self.emit('connect'); });
		this._socket.on('data', function(data) { self.emit('data', data); });
		this._socket.on('error', function(err) { self.emit('error', err); });
		this._socket.on('end', function() { self.emit('end'); });
};

NetTransport.prototype.write = function (data) {
	if(!this._socket) 
		throw new Error('Socket not connected');
	
	this._socket.write(data);
};

NetTransport.prototype.end = function() {
	if(!this._socket) 
		throw new Error('Socket not connected');
	
	this._socket.end();
};

NetTransport.prototype.destroy = function() {
	if(this._socket) {
		this._socket.destroy();
		this._socket = null;
	}
	
	this.removeAllListeners();
};

module.exports = NetTransport; 
