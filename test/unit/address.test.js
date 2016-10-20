'use strict';
var Policies = require('../../lib').Policy,
    DefaultPolicy = Policies.Default,
    QpidJavaPolicy = Policies.QpidJava,
    ActiveMQPolicy = Policies.ActiveMQ,
    expect = require('chai').expect,
    u = require('../../lib/utilities');

describe('Address Parsing', function() {
  describe('default', function() {
    [
      {
        description: 'a plain host (1)',
        address: 'localhost',
        expected: {
          protocol: 'amqp', host: 'localhost', port: 5672, path: '/',
          rootUri: 'amqp://localhost:5672',
          href: 'localhost'
        }
      },
      {
        description: 'a plain host (2)',
        address: '192.168.1.9',
        expected: {
          protocol: 'amqp', host: '192.168.1.9', port: 5672, path: '/',
          rootUri: 'amqp://192.168.1.9:5672',
          href: '192.168.1.9'
        }
      },
      {
        description: 'amqp no port no route',
        address: 'amqp://127.0.0.1',
        expected: {
          protocol: 'amqp', host: '127.0.0.1', port: 5672, path: '/',
          rootUri: 'amqp://127.0.0.1:5672',
          href: 'amqp://127.0.0.1'
        }
      },
      {
        description: 'amqps no port no route',
        address: 'amqps://localhost',
        expected: {
          protocol: 'amqps', host: 'localhost', port: 5671, path: '/',
          rootUri: 'amqps://localhost:5671',
          href: 'amqps://localhost'
        }
      },
      {
        description: 'should match with port and with/without route (1)',
        address: 'amqp://localhost:1234',
        expected: {
          protocol: 'amqp', host: 'localhost', port: 1234, path: '/',
          rootUri: 'amqp://localhost:1234',
          href: 'amqp://localhost:1234'
        }
      },
      {
        description: 'should match with port and with/without route (2)',
        address: 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments',
        expected: {
          protocol: 'amqps', host: 'mq.myhost.com', port: 1235,
          path: '/myroute?with=arguments&multiple=arguments',
          rootUri: 'amqps://mq.myhost.com:1235',
          href: 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments'
        }
      },
      {
        description: 'should match ip + port',
        address: 'amqp://10.42.1.193:8118/testqueue',
        expected: {
          protocol: 'amqp', host: '10.42.1.193', port: 8118, path: '/testqueue',
          rootUri: 'amqp://10.42.1.193:8118',
          href: 'amqp://10.42.1.193:8118/testqueue'
        }
      },
      {
        description: 'should match credentials no port no route',
        address: 'amqp://username:password@my.amqp.server',
        expected: {
          protocol: 'amqp', host: 'my.amqp.server', port: 5672, path: '/',
          user: 'username', pass: 'password',
          rootUri: 'amqp://username:password@my.amqp.server:5672',
          href: 'amqp://username:password@my.amqp.server'
        }
      },
      {
        description: 'should match credentials with port and route',
        address: 'amqps://username:password@192.168.1.1:1234/myroute',
        expected: {
          protocol: 'amqps', host: '192.168.1.1', port: 1234, path: '/myroute',
          user: 'username', pass: 'password',
          rootUri: 'amqps://username:password@192.168.1.1:1234',
          href: 'amqps://username:password@192.168.1.1:1234/myroute'
        }
      }
    ].forEach(function(testCase) {
      it('should match ' + testCase.description, function() {
        var policy = DefaultPolicy;
        expect(policy.parseAddress(testCase.address))
          .to.eql(testCase.expected);
      });
    });
  });

  describe('Qpid Java', function() {
    it('should parse vhosts', function() {
      var address = 'amqps://username:password@192.168.1.1:1234/some-vhost/topic/and/more',
          policy = QpidJavaPolicy;

      expect(policy.parseAddress(address)).to.eql({
        host: '192.168.1.1',
        pass: 'password',
        path: '/topic/and/more',
        port: 1234,
        protocol: 'amqps',
        rootUri: 'amqps://username:password@192.168.1.1:1234',
        user: 'username',
        vhost: 'some-vhost',
        href: 'amqps://username:password@192.168.1.1:1234/some-vhost/topic/and/more'
      });
    });
  });

  describe('ActiveMQ', function() {
    it('should parse link names with `topic://` and `queue://` prefixes', function() {
      var address = 'amqps://username:password@192.168.1.1:1234/topic://mytopic',
          policy = ActiveMQPolicy;

      expect(policy.parseAddress(address)).to.eql({
        host: '192.168.1.1',
        pass: 'password',
        path: '/topic://mytopic',
        port: 1234,
        protocol: 'amqps',
        rootUri: 'amqps://username:password@192.168.1.1:1234',
        user: 'username',
        href: 'amqps://username:password@192.168.1.1:1234/topic://mytopic'
      });
    });

    it('should support links with names prefixed with `topic://` and `queue://`', function() {
      var policy = ActiveMQPolicy;
      var address = policy.parseLinkAddress('topic://mytopic');
      expect(address.name).to.eql('topic://mytopic');
      var linkName = u.linkName(address.name, {});
      var nonUniqueLinkNamePart = linkName.split('_')[0];
      expect(nonUniqueLinkNamePart).to.equal('topic://mytopic');
    });
  });

});
