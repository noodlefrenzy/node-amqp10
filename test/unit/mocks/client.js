'use strict';
var EventEmitter = require('events').EventEmitter,
    AMQPClient = require('../../../lib/amqp_client'),
    Connection = require('../../../lib/connection'),
    Session = require('../../../lib/session'),
    Link = require('../../../lib/link'),
    expect = require('chai').expect;

module.exports = function(c, s) {
  var client = new AMQPClient();
  client._newConnection = function() {
    client._clearState();
    c._created++;
    return c;
  };

  client._newSession = function(conn) {
    for (var lname in s._mockLinks) {
      var l = s._mockLinks[lname];
      [Link.MessageReceived, Link.ErrorReceived, Link.CreditChange, Link.Detached].forEach(l.removeAllListeners);
    }
    expect(c).to.equal(conn);
    s._created++;
    return s;
  };

  client._clearState = function() {
    var connEvts = [Connection.Connected, Connection.Disconnected];
    var sessEvts = [Session.Mapped, Session.Unmapped, Session.ErrorReceived, Session.LinkAttached, Session.LinkDetached, Session.DispositionReceived];
    var idx, e;
    for (idx in connEvts) {
      e = connEvts[idx];
      c.removeAllListeners(e);
      expect(EventEmitter.listenerCount(c, e)).to.eql(0);
    }
    for (idx in sessEvts) {
      e = sessEvts[idx];
      s.removeAllListeners(e);
      expect(EventEmitter.listenerCount(s, e)).to.eql(0);
    }
  };

  return client;
};
