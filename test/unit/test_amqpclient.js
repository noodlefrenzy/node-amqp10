'use strict';

var debug = require('debug')('amqp10-test_amqpclient'),
    expect = require('chai').expect,
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Promise = require('bluebird'),

    AMQPClient = require('../../lib/amqp_client'),
    constants = require('../../lib/constants'),
    Connection = require('../../lib/connection'),
    Session = require('../../lib/session'),
    Link = require('../../lib/link'),
    Sender = require('../../lib/sender_link'),

    u = require('../../lib/utilities'),
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
  this.emit('attachLink-called', this, policy, link);
};

MockSession.prototype._addMockLink = function(link) {
  this._mockLinks[link.name] = link;
};

function MockLink(session, options) {
  this._created = 0;
  this.session = session;
  this.options = options;
  this._clearState();
}

util.inherits(MockLink, EventEmitter);

MockLink.prototype._clearState = function() {
  this.name = this.options.name;
  this.isSender = this.options.isSender || false;
  this.capacity = this.options.capacity || 0;
  this.messages = [];
  this.curId = 0;
};

function MockSenderLink(session, options) {
  this._created = 0;
  this.session = session;
  this.options = options;
  this._clearState();
}

util.inherits(MockSenderLink, Sender);

MockSenderLink.prototype.canSend = function() {
  this.emit('canSend-called', this);
  return this.capacity > 0;
};

MockSenderLink.prototype._sendMessage = function(msg, options) {
  var self = this;
  self.curId++;
  self.messages.push({ id: self.curId, message: msg.body[0], options: options });
  self.emit('sendMessage-called', self, self.curId, msg, options);
  return self.curId;
};

MockSenderLink.prototype._clearState = function() {
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
    it('should set up connection and session', function() {
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

      return client.connect(mock_uri)
        .then(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(called).to.eql({ open: 1, begin: 1 });
        });
    });
  });

  describe('#send()', function() {
    it('should throw an error if not connected', function () {
      var client = new MakeMockClient();
      expect(function () {
        client.send();
      }).to.throw(Error);
    });

    it('should wait for capacity before sending', function () {
      var c = new MockConnection();
      var s = new MockSession(c);
      var l = new MockSenderLink(s, {
        name: 'queue_TX',
        isSender: true,
        capacity: 0
      });

      s._addMockLink(l);
      var client = new MakeMockClient(c, s);
      var queue = 'queue';
      var called = {open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0};
      c.on('open-called', function (_c, _addr, _sasl) {
        expect(_addr).to.eql(u.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function (_s, _policy) {
        called.begin++;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function (_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.options.target).to.eql({address: queue});
        expect(_policy.options.role).to.eql(constants.linkRole.sender);

        _s.emit(Session.LinkAttached, _l);
      });

      l.on('canSend-called', function () {
        called.canSend++;
      });

      l.on('sendMessage-called', function (_l, id, msg, opts) {
        called.sendMessage++;
        expect(client._pendingSends[_l.name]).to.not.be.empty;
        process.nextTick(function () {
          _l.capacity = 100;
          _l.emit(Link.CreditChange, _l);
        });
        process.nextTick(function () {
          s.emit(Session.DispositionReceived, {
            settled: true,
            state: {},
            first: id,
            last: null
          });
        });
      });

      return client.connect(mock_uri)
        .then(function () {
          return client.createSender(queue);
        })
        .then(function (sender) {
          sender.send({my: 'message'});
        })
        .then(function () {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(1);
          expect(called.canSend).to.eql(2);
          expect(called.sendMessage).to.eql(1);
          expect(l.messages).to.not.be.empty;
          expect(l.messages[0].message).to.eql({my: 'message'});
        });
    });
  });

  describe('#receive()', function() {
    it('should throw an error if not connected', function() {
      var client = new MakeMockClient();
      expect(function() { client.createReceiver(); }).to.throw(Error);
    });


    function DelayedAttachMockSession(conn) {
      MockSession.call(this);
    }
    util.inherits(DelayedAttachMockSession, MockSession);

    DelayedAttachMockSession.prototype.attachLink = function(policy) {
      var link = this._mockLinks[policy.options.name];
      expect(link).to.exist;
      link._created++;
      link._clearState();

      // emulate some delayed link attachment
      var self = this;
      setTimeout(function() {
        self.emit('attachLink-called', self, policy, link);
      }, 100);
    };

    it('should return cached receiver links upon multiple createReceive calls', function() {
      var c = new MockConnection();
      var s = new DelayedAttachMockSession(c);
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
        expect(_policy.options.source).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        _s.emit(Session.LinkAttached, _l);
      });

      var originalLink;
      return client.connect(mock_uri)
        .then(function() {
          // create but don't wait so we can simulate an attaching link
          client.createReceiver(queue, function(err, payload, annotations) {})
            .then(function(link) {
              originalLink = link;
            });
        })
        .then(function() {
          return Promise.all([
            client.createReceiver(queue, function(err, payload, annotations) {}),
            client.createReceiver(queue, function(err, payload, annotations) {}),
            client.createReceiver(queue, function(err, payload, annotations) {})
          ]);
        })
        .spread(function(link1, link2, link3) {
          expect(originalLink).to.exist;
          expect(link1).to.eql(originalLink);
          expect(link1).to.eql(link2);
          expect(link1).to.eql(link3);
          expect(link2).to.eql(link3);
        });
    });


    it('should create connection, session, and link on receive with full address', function() {
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
        expect(_policy.options.source).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        _s.emit(Session.LinkAttached, _l);
      });

      return client.connect(mock_uri)
        .then(function() {
          return client.createReceiver(queue, function(err, payload, annotations) {});
        })
        .then(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(1);
        });
    });

    it('should only create a single connection, session, multiple links for multiple receives', function() {
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

      return client.connect(mock_uri)
        .then(function() {
          return Promise.all([
            client.createReceiver('queue1', function(err, payload, annotations) {}),
            client.createReceiver('queue2', function(err, payload, annotations) {})
          ]);
        })
        .then(function() {
          expect(c._created).to.eql(1);
          expect(s._created).to.eql(1);
          expect(l1._created).to.eql(1);
          expect(l2._created).to.eql(1);
          expect(called.open).to.eql(1);
          expect(called.begin).to.eql(1);
          expect(called.attachLink).to.eql(2);
        });
    });

    it('should re-establish receive link on detach, automatically', function() {
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
        expect(_policy.options.source).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            _l.emit(Link.Detached);
            _s.emit(Session.LinkDetached, _l);
          });
        }
        _s.emit(Session.LinkAttached, _l);
      });

      return client.connect(mock_uri)
        .then(function() {
          return client.createReceiver(queue, function() {});
        })
        .then(function() {
          process.nextTick(function() {
            expect(c._created).to.eql(1);
            expect(s._created).to.eql(1);
            expect(l._created).to.eql(2);
            expect(called.open).to.eql(1);
            expect(called.begin).to.eql(1);
            expect(called.attachLink).to.eql(2);
          });
        });
    });

    it('should re-establish connection on disconnect, automatically', function() {
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
        expect(_policy.options.source).to.eql({ address: queue });
        expect(_policy.options.role).to.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            c.emit(Connection.Disconnected);
          });
        }

        _s.emit(Session.LinkAttached, _l);
      });

      return client.connect(mock_uri)
        .then(function() {
          return client.createReceiver(queue, function() {});
        })
        .then(function() {
          process.nextTick(function() {
            expect(c._created).to.eql(2);
            expect(s._created).to.eql(2);
            expect(l._created).to.eql(2);
            expect(called.open).to.eql(2);
            expect(called.begin).to.eql(2);
            expect(called.attachLink).to.eql(2);
          });
        });
    });
  });
});
