'use strict';
var EventEmitter = require('events').EventEmitter,
    util = require('util');

function MockConnection() {
  this._created = 0;
}

util.inherits(MockConnection, EventEmitter);

MockConnection.prototype.open = function(addr, sasl) {
  this.emit('open-called', this, addr, sasl);
};

MockConnection.prototype.close = function() {
  this.emit('close-called', this);
};

module.exports = MockConnection;
