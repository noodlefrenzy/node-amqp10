'use strict';

var expect = require('chai').expect,
    Promise = require('bluebird'),

    constants = require('../../lib/constants'),
    Connection = require('../../lib/connection'),
    Session = require('../../lib/session'),
    Link = require('../../lib/link'),

    Mock = require('./mocks'),
    defaultPolicy = require('../../lib').Policy.Default;

var chai = require('chai');
chai.config.includeStack = true; // turn on stack trace

var mock_uri = 'amqp://localhost/';

describe('AMQPClient', function() {
  describe('#connect()', function() {
    it('should set up connection and session', function() {
      var c = new Mock.Connection();
      var s = new Mock.Session(c);
      var client = new Mock.Client(c, s);
      var called = {open: 0, begin: 0};
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(defaultPolicy.parseAddress(mock_uri));
        expect(_sasl).to.be.null;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;

        _s.mapped = true;
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
      var client = new Mock.Client();
      expect(function () {
        client.send();
      }).to.throw(Error);
    });

    it('should wait for capacity before sending', function () {
      var c = new Mock.Connection();
      var s = new Mock.Session(c);
      var l = new Mock.SenderLink(s, {
        name: 'queue_TX',
        isSender: true,
        capacity: 0
      });

      s._addMockLink(l);
      var client = new Mock.Client(c, s);
      var queue = 'queue';
      var called = {open: 0, begin: 0, attachLink: 0, canSend: 0, sendMessage: 0};
      c.on('open-called', function (_c, _addr, _sasl) {
        expect(_addr).to.eql(defaultPolicy.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function (_s, _policy) {
        called.begin++;

        _s.mapped = true;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function (_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.attach.target).to.eql({address: queue});
        expect(_policy.attach.role).to.eql(constants.linkRole.sender);

        process.nextTick(function() {
          _l.simulateAttaching();
        });
      });

      l.on('canSend-called', function () {
        called.canSend++;
      });

      l.on('sendMessage-called', function (_l, id, msg, opts) {
        called.sendMessage++;
      });

      return client.connect(mock_uri)
        .then(function () {
          return client.createSender(queue, { name: 'queue_TX' });
        })
        .then(function (sender) {
          return Promise.all([
            sender.send({ my: 'message' }),
            process.nextTick(function() {
              sender.capacity = 100;
              sender._dispatchPendingSends();
            })
          ]);
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

    it('should re-establish sender link on detach, automatically', function() {
      var c = new Mock.Connection();
      var s = new Mock.Session(c);
      var l = new Mock.SenderLink(s, {
        name: 'queue_TX',
        isSender: true,
        capacity: 100
      });

      s._addMockLink(l);
      var client = new Mock.Client(c, s);
      var queue = 'queue';
      var called = {open: 0, begin: 0, attachLink: 0};
      c.on('open-called', function (_c, _addr, _sasl) {
        expect(_addr).to.eql(defaultPolicy.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;
        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function (_s, _policy) {
        called.begin++;

        _s.mapped = true;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function (_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.attach.target).to.eql({address: queue});
        expect(_policy.attach.role).to.eql(constants.linkRole.sender);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            _l.emit(Link.Detached);
            _s.emit(Session.LinkDetached, _l);
          });
        }

        process.nextTick(function() {
          _l.simulateAttaching();
        });
      });

      return client.connect(mock_uri)
        .then(function () {
          return client.createSender(queue, { name: 'queue_TX' });
        })
        .then(function (sender) {
          return Promise.all([
            sender.send({ my: 'message' }),
            process.nextTick(function() {
              sender.capacity = 100;
              sender._dispatchPendingSends();
            })
          ]);
        })
        .then(function () {
          process.nextTick(function() {
            expect(c._created).to.eql(1);
            expect(s._created).to.eql(1);
            expect(l._created).to.eql(1);
            expect(called.open).to.eql(1);
            expect(called.begin).to.eql(1);
            expect(called.attachLink).to.eql(2);
          });
        });
    });
  });

  describe('#receive()', function() {
    it('should throw an error if not connected', function() {
      var client = new Mock.Client();
      expect(function() { client.createReceiver(); }).to.throw(Error);
    });

    it('should only create a single connection, session, multiple links for multiple receives', function() {
      var c = new Mock.Connection();
      var s = new Mock.Session(c);
      var l1 = new Mock.ReceiverLink(s, {
        name: 'queue1_RX',
        isSender: false,
        capacity: 100
      });

      var l2 = new Mock.ReceiverLink(s, {
        name: 'queue2_RX',
        isSender: false,
        capacity: 100
      });

      s._addMockLink(l1);
      s._addMockLink(l2);

      var client = new Mock.Client(c, s);
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(defaultPolicy.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;

        _s.mapped = true;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.attach.role).to.eql(constants.linkRole.receiver);

        process.nextTick(function() {
          _l.simulateAttaching();
        });
      });

      return client.connect(mock_uri)
        .then(function() {
          return Promise.all([
            client.createReceiver('queue1', { name: 'queue1_RX' }),
            client.createReceiver('queue2', { name: 'queue2_RX' })
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
      var c = new Mock.Connection();
      var s = new Mock.Session(c);
      var l = new Mock.ReceiverLink(s, {
        name: 'queue_RX',
        isSender: false,
        capacity: 100
      });

      s._addMockLink(l);
      var client = new Mock.Client(c, s);
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(defaultPolicy.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;

        _s.mapped = true;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.attach.source).to.eql({ address: queue });
        expect(_policy.attach.role).to.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            _l.emit(Link.Detached);
            _s.emit(Session.LinkDetached, _l);
          });
        }

        process.nextTick(function() {
          _l.simulateAttaching();
        });
      });

      return client.connect(mock_uri)
        .then(function() {
          return client.createReceiver(queue, { name: 'queue_RX' });
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
      var c = new Mock.Connection();
      var s = new Mock.Session(c);
      var l = new Mock.ReceiverLink(s, {
        name: 'queue_RX',
        isSender: false,
        capacity: 100
      });

      s._addMockLink(l);
      var client = new Mock.Client(c, s);
      var queue = 'queue';
      var called = { open: 0, begin: 0, attachLink: 0 };
      c.on('open-called', function(_c, _addr, _sasl) {
        expect(_addr).to.eql(defaultPolicy.parseAddress(mock_uri));
        expect(_sasl).to.not.exist;

        called.open++;
        _c.emit(Connection.Connected, _c);
      });

      s.on('begin-called', function(_s, _policy) {
        called.begin++;

        _s.mapped = true;
        _s.emit(Session.Mapped, _s);
      });

      s.on('attachLink-called', function(_s, _policy, _l) {
        called.attachLink++;
        expect(_policy.attach.source).to.eql({ address: queue });
        expect(_policy.attach.role).to.eql(constants.linkRole.receiver);
        if (called.attachLink === 1) {
          process.nextTick(function() {
            c.emit(Connection.Disconnected);
          });
        }

        process.nextTick(function() {
          _l.simulateAttaching();
        });
      });

      return client.connect(mock_uri)
        .then(function() {
          return client.createReceiver(queue, { name: 'queue_RX' });
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
