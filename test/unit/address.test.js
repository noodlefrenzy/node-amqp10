"use strict";
var u = require('../../lib/utilities'),
    constants = require('../../lib/constants'),
    expect = require('chai').expect,
    url = require('url');

function parseAddress(address) {
  var parsedAddress = url.parse(address);
  var result = {
    hostname: parsedAddress.hostname,
    path: parsedAddress.path || '/',
    protocol: parsedAddress.protocol.slice(0, -1),
  };

  if (!!parsedAddress.port) {
    result.port = parseInt(parsedAddress.port);
  } else {
    switch (result.protocol.toLowerCase()) {
      case 'amqp': result.port = constants.defaultPort; break;
      case 'amqps': result.port = constants.defaultTlsPort; break;
    }
  }

  result.rootUri = parsedAddress.protocol + '//';
  if (!!parsedAddress.auth) {
    result.rootUri += parsedAddress.auth + '@';
    result.user = parsedAddress.auth.split(':')[0];
    result.pass = parsedAddress.auth.split(':')[1] || null;
  }

  result.rootUri += parsedAddress.hostname + ':' + result.port;
  return result;
}

describe('Address', function() {
  describe('default', function() {
    [
      {
        description: 'amqp no port no route',
        address: 'amqp://127.0.0.1',
        expected: {
          protocol: 'amqp', hostname: '127.0.0.1', port: 5672, path: '/',
          rootUri: 'amqp://127.0.0.1:5672'
        }
      },
      {
        description: 'amqps no port no route',
        address: 'amqps://localhost',
        expected: {
          protocol: 'amqps', hostname: 'localhost', port: 5671, path: '/',
          rootUri: 'amqps://localhost:5671'
        }
      },
      {
        description: 'should match with port and with/without route (1)',
        address: 'amqp://localhost:1234',
        expected: {
          protocol: 'amqp', hostname: 'localhost', port: 1234, path: '/',
          rootUri: 'amqp://localhost:1234'
        }
      },
      {
        description: 'should match with port and with/without route (2)',
        address: 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments',
        expected: {
          protocol: 'amqps', hostname: 'mq.myhost.com', port: 1235,
          path: '/myroute?with=arguments&multiple=arguments',
          rootUri: 'amqps://mq.myhost.com:1235'
        }
      },
      {
        description: 'should match ip + port',
        address: 'amqp://10.42.1.193:8118/testqueue',
        expected: {
          protocol: 'amqp', hostname: '10.42.1.193', port: 8118, path: '/testqueue',
          rootUri: 'amqp://10.42.1.193:8118'
        }
      },
      {
        description: 'should match credentials no port no route',
        address: 'amqp://username:password@my.amqp.server',
        expected: {
          protocol: 'amqp', hostname: 'my.amqp.server', port: 5672, path: '/',
          user: 'username', pass: 'password',
          rootUri: 'amqp://username:password@my.amqp.server:5672'
        }
      },
      {
        description: 'should match credentials with port and route',
        address: 'amqps://username:password@192.168.1.1:1234/myroute',
        expected: {
          protocol: 'amqps', hostname: '192.168.1.1', port: 1234, path: '/myroute',
          user: 'username', pass: 'password',
          rootUri: 'amqps://username:password@192.168.1.1:1234'
        }
      }
    ].forEach(function(testCase) {
      it('should match ' + testCase.description, function() {
        var result = parseAddress(testCase.address);
        expect(result).to.eql(testCase.expected);
      });
    });

    [
      { address: 'invalid://localhost', error: 'Should validate protocol' },
      { address: 'amqp://host:non-numeric', error: 'Should validate port' },
      { address: 'amqp://host:123:what-is-this?', error: 'Bad regex match' },

    ].forEach(function(testCase, idx) {
      it('should throw error on invalid address (' + (idx+1) + ')', function() {
        expect(function() {
          u.parseAddress(testCase.address);
        }).to.throw(Error, null, testCase.error);
      });
    });
  });

});
