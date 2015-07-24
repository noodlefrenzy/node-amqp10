'use strict';
var EventEmitter = require('events').EventEmitter,
    expect = require('chai').expect,
    util = require('util');

function MockSession(conn) {
  this._created = 0;
  this.connection = conn;
  this._mockLinks = {};
}

util.inherits(MockSession, EventEmitter);

MockSession.prototype.begin = function(policy) {
  this.emit('begin-called', this, policy);
};

MockSession.prototype.attachLink = function(policy) {
  var link = this._mockLinks[policy.options.name];
  expect(link).to.exist;
  link._created++;
  link._clearState();
  link.attached = true;
  this.emit('attachLink-called', this, policy, link);
};

MockSession.prototype._addMockLink = function(link) {
  this._mockLinks[link.name] = link;
};

module.exports = MockSession;
