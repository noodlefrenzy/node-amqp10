'use strict';

var util = require("util");
var EventEmitter = require('events');
var ws = require('nodejs-websocket');
var debug = require('debug')('amqp10:connection:websocketclient');

function WebSocketClient () {
	EventEmitter.call(this);
	this._client = null;
}

util.inherits(WebSocketClient, EventEmitter);

/** TODO
 *  - verify frame size for binary transfers.
 *  - double check if we need the text transfers.
 *  - verify resources are properly destroyed.
 */ 

WebSocketClient.prototype.connect = function (address) {
	this._client = ws.connect(address.href, { extraHeaders: { 'Sec-Websocket-Protocol': 'AMQPWSB10' } }, function() {
		debug('Websocket connection initiated');
	});
	
	this._client.on('connect', function () {
		this.emit('connect');    
	}.bind(this));
	
	this._client.on('binary', function (inStream) {
		// Empty buffer for collecting binary data
		var data = new Buffer(0);
		// Read chunks of binary data and add to the buffer
		inStream.on("readable", function () {
			var newData = inStream.read();
			if (newData) {
				data = Buffer.concat([data, newData], data.length+newData.length);
			}
		});
		
		inStream.on("end", function () {
			debug("Received " + data.length + " bytes of binary data over websocket connection");
			this.emit('data', data);      
		}.bind(this));
	}.bind(this));
	
	this._client.on('error', function (err) {
		this.emit('error', err);      	
	}.bind(this));
	
	this._client.on('text', function (text) {
		debug("Received text data over websocket connection");
		this.emit('data', text);
	}.bind(this));
	
	this._client.on('close', function (code, reason) {
		debug('Websocket connection closed with code: ' + code + " (" + reason + ")");
		this.emit('end');   
	}.bind(this));
};

WebSocketClient.prototype.write = function (data) {
	if(this._client) {
		this._client.sendBinary(data);
	} else {
		throw new Error('Socket not connected');
	}
};

WebSocketClient.prototype.end = function() {
	if (this._client) {
		this._client.close();
	} else {
		throw new Error('Socket not connected');
	}
};

WebSocketClient.prototype.destroy = function() {
	if (this._client) {
		this._client = null;
		this.removeAllListeners();
	} else {
		throw new Error('Socket not connected');
	}
};

module.exports = WebSocketClient;