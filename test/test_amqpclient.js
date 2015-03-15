'use strict';

var debug = require('debug')('amqp10-test_amqpclient'),
    should = require('should'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,

    AMQPClient = require('../lib/amqp_client'),
    constants = require('../lib/constants'),
    Connection = require('../lib/connection'),
    Session = require('../lib/session').Session,
    Link = require('../lib/session').Link,

    u = require('../lib/utilities'),
    tu = require('./testing_utils');

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

function MockSession(conn) {
  this._created = 0;
  this._conn = conn;
  this._mockLinks = {};
}

util.inherits(MockSession, EventEmitter);

MockSession.prototype.begin = function(policy) {
  this.emit('begin-called', this, policy);
};

MockSession.prototype.attachLink = function(policy) {
  var link = this._mockLinks[policy.options.name];
  (link !== undefined).should.be.true;
  link._created++;
  link._clearState();
  this.emit('attachLink-called', this, policy, link);
};

MockSession.prototype._addMockLink = function(link) {
  this._mockLinks[link.name] = link;
};

function MockLink(session, options) {
  this._created = 0;
  this._session = session;
  this.options = options;
  this._clearState();
}

util.inherits(MockLink, EventEmitter);

MockLink.prototype.canSend = function() {
  this.emit('canSend-called', this);
  return this.capacity > 0;
};

MockLink.prototype.sendMessage = function(msg, options) {
  this.curId++;
  this.messages.push({ id: this.curId, message: msg.body[0], options: options });
  this.emit('sendMessage-called', this, this.curId, msg, options);
  return this.curId;
};

MockLink.prototype._clearState = function() {
  this.name = this.options.name;
  this.options = this.options;
  this.isSender = this.options.isSender || false;
  this.capacity = this.options.capacity || 0;
  this.messages = [];
  this.curId = 0;
};

function MakeMockClient(c, s) {
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
    c.should.eql(conn);
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
      EventEmitter.listenerCount(c, e).should.eql(0);
    }
    for (idx in sessEvts) {
      e = sessEvts[idx];
      s.removeAllListeners(e);
      EventEmitter.listenerCount(s, e).should.eql(0);
    }
  };
  return client;
}

describe('AMQPClient', function() {

  describe('#connect()', function() {
    it('should set up connection and session', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost';
      var called = {open: 0, begin: 0};
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      client.connect(addr, function(err, _client) {
        (err === null).should.be.true;
        c._created.should.eql(1);
        s._created.should.eql(1);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        done();
      });
    });
  });

  describe('#send()', function() {
    it('should create connection, session, and link on send with full address', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_TX',
                isSender: true,
                capacity: 100
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.target.should.eql({ address: queue });
        _policy.options.role.should.eql(constants.linkRole.sender);
        _s.emit(Session.LinkAttached, _l);
      });
      l.on('canSend-called', function() {
        called.canSend++;
      });
      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        setTimeout(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        }, 50);
      });
      client.send({ my: 'message' }, addr + queue, function(err) {
        (err === null).should.be.true;
        c._created.should.eql(1);
        s._created.should.eql(1);
        l._created.should.eql(1);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        called.attachLink.should.eql(1);
        called.canSend.should.eql(1);
        called.sendMessage.should.eql(1);
        l.messages.length.should.eql(1);
        l.messages[0].message.should.eql({ my: 'message' });
        done();
      });
    });
    it('should wait for capacity before sending', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_TX',
                isSender: true,
                capacity: 0
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        client._pendingSends[_l.name].length.should.eql(1);
        _policy.options.target.should.eql({ address: queue });
        _policy.options.role.should.eql(constants.linkRole.sender);
        setTimeout(function() {
          _l.capacity = 100;
          _l.emit(Link.CreditChange, _l);
        }, 100);
        _s.emit(Session.LinkAttached, _l);
      });
      l.on('canSend-called', function() {
        called.canSend++;
      });
      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        setTimeout(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        }, 50);
      });
      client.send({ my: 'message' }, addr + queue, function(err) {
        (err === null).should.be.true;
        c._created.should.eql(1);
        s._created.should.eql(1);
        l._created.should.eql(1);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        called.attachLink.should.eql(1);
        called.canSend.should.eql(2);
        called.sendMessage.should.eql(1);
        l.messages.length.should.eql(1);
        l.messages[0].message.should.eql({ my: 'message' });
        done();
      });
    });
    it('should only create a single connection, session, link for multiple sends', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_TX',
                isSender: true,
                capacity: 100
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.target.should.eql({ address: queue });
        _policy.options.role.should.eql(constants.linkRole.sender);
        _s.emit(Session.LinkAttached, _l);
      });
      l.on('canSend-called', function() {
        called.canSend++;
      });
      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        setTimeout(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        }, 50);
      });
      for (var idx = 0; idx < 5; idx++) {
        client.send({my: 'message'}, addr + queue, function() {});
      }
      setTimeout(function() {
        c._created.should.eql(1);
        s._created.should.eql(1);
        l._created.should.eql(1);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        called.attachLink.should.eql(1);
        called.canSend.should.eql(5);
        called.sendMessage.should.eql(5);
        l.messages.length.should.eql(5);
        done();
      }, 100);
    });
    it('should re-establish send link on detach, on next send', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_TX',
                isSender: true,
                capacity: 100
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.target.should.eql({ address: queue });
        _policy.options.role.should.eql(constants.linkRole.sender);
        if (called.attachLink === 1) {
          setTimeout(function() {
            _l.emit(Link.Detached);
            _s.emit(Session.LinkDetached, _l);
          }, 100);
        }
        _s.emit(Session.LinkAttached, _l);
      });
      l.on('canSend-called', function() {
        called.canSend++;
      });
      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        setTimeout(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        }, 50);
      });
      client.send({my: 'message'}, addr + queue, function() {});
      setTimeout(function() {
        client.send({my: 'message'}, addr + queue, function() {});
      }, 150);
      setTimeout(function() {
        c._created.should.eql(1);
        s._created.should.eql(1);
        l._created.should.eql(2);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        called.attachLink.should.eql(2);
        called.canSend.should.eql(2);
        called.sendMessage.should.eql(2);
        l.messages.length.should.eql(1);
        done();
      }, 400);
    });
    it('should re-establish connection on disconnect, on next send', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_TX',
                isSender: true,
                capacity: 100
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.target.should.eql({ address: queue });
        _policy.options.role.should.eql(constants.linkRole.sender);
        if (called.attachLink === 1) {
          setTimeout(function() {
            c.emit(Connection.Disconnected);
          }, 100);
        }
        _s.emit(Session.LinkAttached, _l);
      });
      l.on('canSend-called', function() {
        called.canSend++;
      });
      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        setTimeout(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        }, 50);
      });
      client.send({my: 'message'}, addr + queue, function() {});
      setTimeout(function() {
        client.send({my: 'message'}, addr + queue, function() {});
      }, 150);
      setTimeout(function() {
        c._created.should.eql(2);
        s._created.should.eql(2);
        l._created.should.eql(2);
        called.open.should.eql(2);
        called.begin.should.eql(2);
        called.attachLink.should.eql(2);
        called.canSend.should.eql(2);
        called.sendMessage.should.eql(2);
        l.messages.length.should.eql(1);
        done();
      }, 400);
    });
    it('should re-establish connection on disconnect, if send is pending', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_TX',
                isSender: true,
                capacity: 0
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        client._pendingSends[_l.name].length.should.eql(1);
        _policy.options.target.should.eql({ address: queue });
        _policy.options.role.should.eql(constants.linkRole.sender);
        if (called.attachLink === 1) {
          setTimeout(function() {
            c.emit(Connection.Disconnected);
          }, 50);
        } else {
          setTimeout(function() {
            _l.capacity = 100;
            _l.emit(Link.CreditChange, _l);
          }, 100);
        }
        _s.emit(Session.LinkAttached, _l);
      });
      l.on('canSend-called', function() {
        called.canSend++;
      });
      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        setTimeout(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        }, 50);
      });
      client.send({my: 'message'}, addr + queue, function() {});
      setTimeout(function() {
        c._created.should.eql(2);
        s._created.should.eql(2);
        l._created.should.eql(2);
        called.open.should.eql(2);
        called.begin.should.eql(2);
        called.attachLink.should.eql(2);
        called.canSend.should.eql(3);
        called.sendMessage.should.eql(1);
        l.messages.length.should.eql(1);
        done();
      }, 400);
    });
  });

  describe('#receive()', function() {
    it('should create connection, session, and link on receive with full address', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_RX',
                isSender: false,
                capacity: 100
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.source.should.eql({ address: queue, filter: undefined });
        _policy.options.role.should.eql(constants.linkRole.receiver);
        _s.emit(Session.LinkAttached, _l);
      });
      client.receive(addr + queue, function(err, payload, annotations) {
      });
      setTimeout(function() {
        c._created.should.eql(1);
        s._created.should.eql(1);
        l._created.should.eql(1);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        called.attachLink.should.eql(1);
        done();
      }, 50);
    });
    it('should only create a single connection, session, multiple links for multiple receives', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l1 = new MockLink(s, {
        name: 'queue1_RX',
        isSender: false,
        capacity: 100
      });
      var l2 = new MockLink(s, {
        name: 'queue2_RX',
        isSender: false,
        capacity: 100
      });
      s._addMockLink(l1);
      s._addMockLink(l2);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.role.should.eql(constants.linkRole.receiver);
        _s.emit(Session.LinkAttached, _l);
      });
      client.receive(addr + 'queue1', function(err, payload, annotations) {});
      client.receive(addr + 'queue2', function(err, payload, annotations) {});
      setTimeout(function() {
        c._created.should.eql(1);
        s._created.should.eql(1);
        l1._created.should.eql(1);
        l2._created.should.eql(1);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        called.attachLink.should.eql(2);
        done();
      }, 100);
    });
    it('should re-establish receive link on detach, automatically', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_RX',
                isSender: false,
                capacity: 100
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.source.should.eql({ address: queue, filter: undefined });
        _policy.options.role.should.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          setTimeout(function() {
            _l.emit(Link.Detached);
            _s.emit(Session.LinkDetached, _l);
          }, 50);
        }
        _s.emit(Session.LinkAttached, _l);
      });
      client.receive(addr + queue, function() {});
      setTimeout(function() {
        c._created.should.eql(1);
        s._created.should.eql(1);
        l._created.should.eql(2);
        called.open.should.eql(1);
        called.begin.should.eql(1);
        called.attachLink.should.eql(2);
        done();
      }, 400);
    });
    it('should re-establish connection on disconnect, automatically', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockLink(s, {
                name: 'queue_RX',
                isSender: false,
                capacity: 100
      });
      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var addr = 'amqp://localhost/';
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        _addr.should.eql(u.parseAddress(addr));
        (_sasl === null).should.be.true;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });
      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });
      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        _policy.options.source.should.eql({ address: queue, filter: undefined });
        _policy.options.role.should.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          setTimeout(function() {
            c.emit(Connection.Disconnected);
          }, 100);
        }
        _s.emit(Session.LinkAttached, _l);
      });
      client.receive(addr + queue, function() {});
      setTimeout(function() {
        c._created.should.eql(2);
        s._created.should.eql(2);
        l._created.should.eql(2);
        called.open.should.eql(2);
        called.begin.should.eql(2);
        called.attachLink.should.eql(2);
        done();
      }, 400);
    });
  });
});
