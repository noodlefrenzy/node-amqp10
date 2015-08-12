'use strict';
var Session = require('../../../lib/session'),

    expect = require('chai').expect,
    util = require('util');

function MockSession(conn) {
  MockSession.super_.call(this);

  this._created = 0;
  this.connection = conn;
  this._mockLinks = {};
}

util.inherits(MockSession, Session);

MockSession.prototype.begin = function(policy) {
  this.emit('begin-called', this, policy);
};

MockSession.prototype.createLink = function(policy) {
  var link = this._mockLinks[policy.attach.name];
  expect(link).to.exist;

  link._created++;
  link._clearState();
  link.attached = true;
  link.handle = policy.attach.handle;
  this.emit('attachLink-called', this, policy, link);
  return link;
};

MockSession.prototype._addMockLink = function(link) {
  this._mockLinks[link.name] = link;
};

module.exports = MockSession;
