'use strict';

var debug = require('debug')('amqp10-test_utilities'),
    expect = require('chai').expect,

    constants = require('../lib/constants'),
    u = require('../lib/utilities'),
    DescribedType = require('../lib/types/described_type'),
    Fields = require('../lib/types/amqp_composites').Fields,
    AMQPSymbol = require('../lib/types/amqp_symbol'),
    ST = require('../lib/types/source_target'),
    Source = ST.Source,
    Target = ST.Target,
    tu = require('./testing_utils');

describe('Utilities', function() {
  describe('#contains()', function() {
    it('should find value when contained', function() {
      expect(u.contains([1, 2, 3], 2)).to.be.true;
    });

    it('should not find value when missing', function() {
      expect(u.contains([1, 2, 3], 4)).to.be.false;
    });

    it('should cope with null/empty arrays', function() {
      expect(u.contains(null, 2)).to.be.false;
      expect(u.contains([], 2)).to.be.false;
    });
  });

  describe('#bufferEquals()', function() {
    it('should succeed when equal', function() {
      var b1 = tu.buildBuffer([1, 2, 3, 4]);
      var b2 = tu.buildBuffer([1, 2, 3, 4]);
      expect(u.bufferEquals(b1, b2)).to.be.true;
    });
    it('should only operate on slices expected', function() {
      var b1 = tu.buildBuffer([1, 2, 3, 4, 5]);
      var b2 = tu.buildBuffer([2, 3, 4, 5, 6]);
      expect(u.bufferEquals(b1, b2, 1, 0, 4)).to.be.true;
    });
    it('should return false quickly on unequal size buffers', function() {
      // Ideally, I'd use two huge buffers, set the timeout low, and ensure the test passes in the time allotted,
      //  but that's (a) a pain, and (b) prone to sporadic failures, so just ensuring it at least gives the right answer.
      var b1 = tu.buildBuffer([1]);
      var b2 = tu.buildBuffer([1, 2]);
      expect(u.bufferEquals(b1, b2)).to.be.false;
    });
  });

  describe('#coerce()', function() {
    it('should coerce strings into symbols', function() {
      var result = u.coerce('en-US', AMQPSymbol);
      expect(result).to.be.an.instanceOf(AMQPSymbol);
    });

    it('should ignore if of same type', function() {
      var result = u.coerce(new AMQPSymbol('en-US'), AMQPSymbol);
      expect(result).to.be.an.instanceOf(AMQPSymbol);
      expect(result.contents).to.be.a('string');
    });

    it('should coerce array of values', function() {
      var result = u.coerce(['a', 'b', 'c'], AMQPSymbol);
      expect(result).to.be.an.instanceOf(Array);
      expect(result).to.have.length(3);
      expect(result[0]).to.be.an.instanceOf(AMQPSymbol);
    });

    it('should pass through nulls', function() {
      var result = u.coerce(null, AMQPSymbol);
      expect(result).to.be.null;
    });
  });

  describe('#deepMerge()', function() {
    it('should work for flat', function() {
      var flat = { foo: 1, bar: 2 };
      var defaults = { bar: 3, baz: 4 };
      var merged = u.deepMerge(flat, defaults);
      expect(merged).to.eql({ foo: 1, bar: 2, baz: 4 });
    });

    it('should work for nested', function() {
      var nested = { foo: { bar: 1, baz: 2 }, bat: 3 };
      var defaults = { foo: { zoop: 1 }, dubin: { a: 1 } };
      var merged = u.deepMerge(nested, defaults);
      expect(merged).to.eql({ foo: { bar: 1, baz: 2, zoop: 1 }, bat: 3, dubin: { a: 1 }});
    });

    // @todo Fix deepMerge to preserve object __proto__ identity.
    it('should work for nested with custom types', function() {
      var nested = { foo: { bar: new AMQPSymbol('s1') } };
      var defaults = { foo: { baz: new AMQPSymbol('s2') }, bat: new AMQPSymbol('s3') };
      var merged = u.deepMerge(nested, defaults);
      expect(merged.bat).to.be.an.instanceOf(AMQPSymbol);
      expect(merged.foo.bar).to.be.an.instanceOf(AMQPSymbol);
      expect(merged.foo.baz).to.be.an.instanceOf(AMQPSymbol);
    });

    it('should work for described types', function() {
      var dt = new DescribedType(new AMQPSymbol('keyname'), 'value string');
      var merged = u.deepMerge({ options: dt });
      expect(merged.options).to.be.an.instanceOf(DescribedType);
      expect(merged.options.descriptor).to.be.an.instanceOf(AMQPSymbol);
      expect(merged.options.descriptor.contents).to.eql('keyname');
      expect(merged.options.value).to.eql('value string');
    });

    it('should work for attach frame details', function() {
      var input = { options: {
        name: 'recv',
                    role: constants.linkRole.receiver,
                    source: new Source({
          address: 'recv',
          filter: new Fields({
                        'apache.org:selector-filter:string' :
                            new DescribedType(new AMQPSymbol('apache.org:selector-filter:string'),
                                "amqp.annotation.x-opt-offset > '" + 1000 + "'")
          })
        }),
                    target: new Target({
          address: 'localhost'
        }),
                    senderSettleMode: constants.senderSettleMode.settled,
                    receiverSettleMode: constants.receiverSettleMode.autoSettle,
                    maxMessageSize: 10000,
                    initialDeliveryCount: 1
      }};
      var merged = u.deepMerge(input);
      expect(merged).to.eql(input);
    });

    it('should work for chains', function() {
      var last = { a: 1, b: 1, c: 1 };
      var middle = { b: 2, c: 2 };
      var first = { c: 3 };
      var merged = u.deepMerge(first, middle, last);
      expect(merged).to.eql({ a: 1, b: 2, c: 3 });
    });
  });

  describe('#parseAddress()', function() {

    it('should match amqp(|s) no port no route', function() {
      var addr = 'amqp://localhost';
      var result = u.parseAddress(addr);
      expect(result.protocol).to.eql('amqp');
      expect(result.host).to.eql('localhost');
      expect(result.port).to.eql(5672);
      expect(result.path).to.eql('/');

      addr = 'amqps://127.0.0.1';
      result = u.parseAddress(addr);
      expect(result).to.eql({
        protocol: 'amqps',
        host: '127.0.0.1',
        port: 5671,
        rootUri: 'amqps://127.0.0.1:5671',
        path: '/'
      });
    });

    it('should match with port and with/without route', function() {
      var addr = 'amqp://localhost:1234';
      var result = u.parseAddress(addr);
      expect(result).to.eql({
        protocol: 'amqp',
        host: 'localhost',
        port: 1234,
        rootUri: 'amqp://localhost:1234',
        path: '/'
      });

      addr = 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments';
      result = u.parseAddress(addr);
      expect(result).to.eql({
        protocol: 'amqps',
        host: 'mq.myhost.com',
        port: 1235,
        rootUri: 'amqps://mq.myhost.com:1235',
        path: '/myroute?with=arguments&multiple=arguments'
      });
    });

    it('should match ip + port', function() {
      var addr = 'amqp://10.42.1.193:5672/testqueue';
      var result = u.parseAddress(addr);
      expect(result).to.eql({
        protocol: 'amqp',
        host: '10.42.1.193',
        port: 5672,
        rootUri: 'amqp://10.42.1.193:5672',
        path: '/testqueue'
      });
    });

    it('should match credentials no port no route', function() {
      var addr = 'amqp://username:password@my.amqp.server';
      var result = u.parseAddress(addr);
      expect(result).to.eql({
        protocol: 'amqp',
        host: 'my.amqp.server',
        port: 5672,
        path: '/',
        user: 'username',
        pass: 'password',
        rootUri: 'amqp://username:password@my.amqp.server:5672'
      });
    });

    it('should match credentials with port and route', function() {
      var addr = 'amqps://username:password@192.168.1.1:1234/myroute';
      var result = u.parseAddress(addr);
      expect(result).to.eql({
        protocol: 'amqps',
        user: 'username',
        pass: 'password',
        host: '192.168.1.1',
        port: 1234,
        path: '/myroute',
        rootUri: 'amqps://username:password@192.168.1.1:1234'
      });
    });

    it('should throw error on invalid address', function() {
      var addr = 'invalid://localhost';
      expect(function() {
        u.parseAddress(addr);
      }).to.throw(Error, null, 'Should validate protocol');

      addr = 'amqp://host:non-numeric';
      expect(function() {
        u.parseAddress(addr);
      }).to.throw(Error, null, 'Should validate port');

      addr = 'amqp://host:123:what-is-this?';
      expect(function() {
        u.parseAddress(addr);
      }).to.throw(Error, null, 'Bad regex match');
    });
  });
});
