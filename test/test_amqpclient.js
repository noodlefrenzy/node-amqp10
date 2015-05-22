'use strict';

var debug = require('debug')('amqp10-test_amqpclient'),
    expect = require('chai').expect,
    util = require('util'),
    EventEmitter = require('events').EventEmitter,

    AMQPClient = require('../lib/amqp_client'),
    constants = require('../lib/constants'),
    Connection = require('../lib/connection'),
    Session = require('../lib/session').Session,
    Link = require('../lib/session').Link,

    u = require('../lib/utilities'),
    tu = require('./testing_utils');

var chai = require('chai');
chai.config.includeStack = true; // turn on stack trace

var mock_uri = 'amqp://localhost/';

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
  expect(link).to.exist;
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
}

describe('AMQPClient', function() {
  describe('#connect()', function() {
    it('should set up connection and session', function(done) {
      var c = new MockConnection();
      var s = new MockSession(c);
      var client = new MakeMockClient(c, s);
      var called = {open: 0, begin: 0};
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.be.null;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      client.connect(mock_uri, function(err, _client) {
        expect(err).to.be.null;
        expect(c._created).to.eql(1);
        expect(s._created).to.eql(1);
        expect(called).to.eql({ open: 1, begin: 1 });
        done();
      });
    });
  });

  describe('#send()', function() {
    it('should throw an error if not connected', function() {
      var client = new MakeMockClient();
      expect(function() { client.send(); }).to.throw(Error);
    });

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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.be.null;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.target).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.sender);
        _s.emit(Session.LinkAttached, _l);
      });

      l.on('canSend-called', function() {
        called.canSend++;
      });

      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        process.nextTick(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        });
      });

      client.connect(mock_uri, function(err, _client) {
        _client.send({ my: 'message' }, queue, function(err) {
          expect(err).to.not.exist;

          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(1);
          expect(called.canSend).to.eql(1);
          expect(called.sendMessage).to.eql(1);
          expect(l.messages).to.not.be.empty;
          expect(l.messages[0].message).to.eql({ my: 'message' });
          done();
        });
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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(client._pendingSends[_l.name]).to.not.be.empty;
        expect(_policy.options.target).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.sender);
        process.nextTick(function() {
          _l.capacity = 100;
          _l.emit(Link.CreditChange, _l);
        });

        _s.emit(Session.LinkAttached, _l);
      });

      l.on('canSend-called', function() {
        called.canSend++;
      });

      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        process.nextTick(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        });
      });

      client.connect(mock_uri, function(err, _client) {
        _client.send({ my: 'message' }, queue, function(err) {
          expect(err).to.not.exist;

          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(1);
          expect(called.canSend).to.eql(2);
          expect(called.sendMessage).to.eql(1);
          expect(l.messages).to.not.be.empty;
          expect(l.messages[0].message).to.eql({ my: 'message' });
          done();
        });
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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.target).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.sender);
        _s.emit(Session.LinkAttached, _l);
      });

      l.on('canSend-called', function() {
        called.canSend++;
      });

      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        process.nextTick(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        });
      });

      client.connect(mock_uri, function(err, _client) {
        var tmpFunction = function () {};
        for (var idx = 0; idx < 5; idx++) {
          _client.send({my: 'message'}, queue, tmpFunction);
        }

        process.nextTick(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(1);
          expect(called.canSend).to.eql(5);
          expect(called.sendMessage).to.eql(5);
          expect(l.messages.length).to.eql(5);
          done();
        });
      });
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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.target).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.sender);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            _l.emit(Link.Detached);
            _s.emit(Session.LinkDetached, _l);
          });
        }
        _s.emit(Session.LinkAttached, _l);
      });

      l.on('canSend-called', function() {
        called.canSend++;
      });

      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        process.nextTick(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        });
      });

      client.connect(mock_uri, function(err, _client) {
        _client.send({my: 'message'}, queue, function() {});
        process.nextTick(function() {
          _client.send({my: 'message'}, queue, function() {});
        });

        process.nextTick(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(2);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(2);
          expect(called.canSend).to.eql(2);
          expect(called.sendMessage).to.eql(2);
          expect(l.messages).to.not.be.empty;
          done();
        });
      });
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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.target).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.sender);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            c.emit(Connection.Disconnected);
          });
        }
        _s.emit(Session.LinkAttached, _l);
      });

      l.on('canSend-called', function() {
        called.canSend++;
      });

      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        process.nextTick(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        });
      });

      client.connect(mock_uri, function(err, _client) {
        _client.send({my: 'message'}, queue, function() {});
        process.nextTick(function() {
          _client.send({my: 'message'}, queue, function() {});
        });

        process.nextTick(function() {
          expect(c._created).to.eql(2);
          expect(s._created).to.eql(2);
          expect(l._created).to.eql(2);
          expect(called.open).to.eql(2);
          expect(called.begin).to.eql(2);
          expect(called.attachLink).to.eql(2);
          expect(called.canSend).to.eql(2);
          expect(called.sendMessage).to.eql(2);
          expect(l.messages).to.not.be.empty;
          done();
        });
      });
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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(client._pendingSends[_l.name]).to.not.be.empty;
        expect(_policy.options.target).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.sender);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            c.emit(Connection.Disconnected);
          });
        } else {
          process.nextTick(function() {
            _l.capacity = 100;
            _l.emit(Link.CreditChange, _l);
          });
        }
        _s.emit(Session.LinkAttached, _l);
      });

      l.on('canSend-called', function() {
        called.canSend++;
      });

      l.on('sendMessage-called', function(_l, id, msg, opts) {
        called.sendMessage++;
        process.nextTick(function() {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: { },
            first: id,
            last: null
          });
        });
      });

      client.connect(mock_uri, function(err, _client) {
        _client.send({my: 'message'}, queue, function() {});

        // NOTE: reverted to setTimeout, but nextTick -should- work...
        setTimeout(function() {
          expect(c._created).to.eql(2);
          expect(s._created).to.eql(2);
          expect(l._created).to.eql(2);
          expect(called.open).to.eql(2);
          expect(called.begin).to.eql(2);
          expect(called.attachLink).to.eql(2);
          expect(called.canSend).to.eql(3);
          expect(called.sendMessage).to.eql(1);
          expect(l.messages).to.not.be.empty;
          done();
        }, 1);
      });
    });
  });

  describe('#receive()', function() {
    it('should throw an error if not connected', function() {
      var client = new MakeMockClient();
      expect(function() { client.receive(); }).to.throw(Error);
    });

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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.source).to.eql({ address: queue, filter: undefined });
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        _s.emit(Session.LinkAttached, _l);
      });

      client.connect(mock_uri, function(err, _client) {
        _client.receive(queue, function(err, payload, annotations) {});
        process.nextTick(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(1);
          done();
        });
      });
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
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        _s.emit(Session.LinkAttached, _l);
      });

      client.connect(mock_uri, function(err, _client) {
        _client.receive('queue1', function(err, payload, annotations) {});
        _client.receive('queue2', function(err, payload, annotations) {});
        process.nextTick(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l1._created).to.eql(1);
          expect(l2._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(2);
          done();
        });
      });
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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.source).to.eql({ address: queue, filter: undefined });
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            _l.emit(Link.Detached);
            _s.emit(Session.LinkDetached, _l);
          });
        }
        _s.emit(Session.LinkAttached, _l);
      });

      client.connect(mock_uri, function(err, _client) {
        _client.receive(queue, function() {});
        process.nextTick(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(2);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(2);
          done();
        });
      });
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
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.source).to.eql({ address: queue, filter: undefined });
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            c.emit(Connection.Disconnected);
          });
        }

        _s.emit(Session.LinkAttached, _l);
      });

      client.connect(mock_uri, function(err, _client) {
        _client.receive(queue, function() {});
        process.nextTick(function() {
          expect(c._created).to.eql(2);
          expect(s._created).to.eql(2);
          expect(l._created).to.eql(2);
          expect(called.open).to.eql(2);
          expect(called.begin).to.eql(2);
          expect(called.attachLink).to.eql(2);
          done();
        });
      });
    });
  });
});
