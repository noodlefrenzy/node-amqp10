'use strict';

var AbstractTransport = require('./abstract_transport.js'),
    util = require('util'),
    tls = require('tls'),
    debug = require('debug')('amqp10:transport:tls'),
    errors = require('../errors');

var TlsTransport = function() {
  AbstractTransport.call(this);
  this._socket = null;
};

util.inherits(TlsTransport, AbstractTransport);

TlsTransport.register = function (transportProvider) {
  transportProvider.registerTransport('amqps', function () {return new TlsTransport(); });
};

TlsTransport.prototype.connect = function (address, sslOpts) {
  var sslOptions = sslOpts || {};
  sslOptions.port = address.port;
  sslOptions.host = address.host;
  this._socket = tls.connect(sslOptions);
  debug('Connecting to ' + address.host + ':' + address.port + ' via TLS');

  var self = this;
  this._socket.on('secureConnect', function() { self.emit('connect'); });
  this._socket.on('data', function(data) { self.emit('data', data); });
  this._socket.on('error', function(err) { self.emit('error', err); });
  this._socket.on('end', function() { self.emit('end'); });
};

TlsTransport.prototype.write = function (data, callback) {
  if (!this._socket) {
    throw new errors.TransportError('Socket not connected');
  }

  this._socket.write(data, callback);
};

TlsTransport.prototype.end = function() {
  if (!this._socket) {
    throw new errors.TransportError('Socket not connected');
  }

  this._socket.end();
};

TlsTransport.prototype.destroy = function() {
  if (this._socket) {
    this._socket.destroy();
    this._socket = null;
  }

  this.removeAllListeners();
};

module.exports = TlsTransport;
