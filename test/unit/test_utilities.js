'use strict';

var debug = require('debug')('amqp10-test_utilities'),
    expect = require('chai').expect,

    constants = require('../../lib/constants'),
    u = require('../../lib/utilities'),
    DescribedType = require('../../lib/types/described_type'),
    Fields = require('../../lib/types/amqp_composites').Fields,
    AMQPSymbol = require('../../lib/types/amqp_symbol'),
    ST = require('../../lib/types/source_target'),
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
    [
      {
        description: 'amqp no port no route',
        address: 'amqp://127.0.0.1',
        expected: {
          protocol: 'amqp', host: '127.0.0.1', port: 5672, path: '/',
          rootUri: 'amqp://127.0.0.1:5672'
        }
      },
      {
        description: 'amqps no port no route',
        address: 'amqps://localhost',
        expected: {
          protocol: 'amqps', host: 'localhost', port: 5671, path: '/',
          rootUri: 'amqps://localhost:5671'
        }
      },
      {
        description: 'should match with port and with/without route (1)',
        address: 'amqp://localhost:1234',
        expected: {
          protocol: 'amqp', host: 'localhost', port: 1234, path: '/',
          rootUri: 'amqp://localhost:1234'
        }
      },
      {
        description: 'should match with port and with/without route (2)',
        address: 'amqps://mq.myhost.com:1235/myroute?with=arguments&multiple=arguments',
        expected: {
          protocol: 'amqps', host: 'mq.myhost.com', port: 1235,
          path: '/myroute?with=arguments&multiple=arguments',
          rootUri: 'amqps://mq.myhost.com:1235'
        }
      },
      {
        description: 'should match ip + port',
        address: 'amqp://10.42.1.193:8118/testqueue',
        expected: {
          protocol: 'amqp', host: '10.42.1.193', port: 8118, path: '/testqueue',
          rootUri: 'amqp://10.42.1.193:8118'
        }
      },
      {
        description: 'should match credentials no port no route',
        address: 'amqp://username:password@my.amqp.server',
        expected: {
          protocol: 'amqp', host: 'my.amqp.server', port: 5672, path: '/',
          user: 'username', pass: 'password',
          rootUri: 'amqp://username:password@my.amqp.server:5672'
        }
      },
      {
        description: 'should match credentials with port and route',
        address: 'amqps://username:password@192.168.1.1:1234/myroute',
        expected: {
          protocol: 'amqps', host: '192.168.1.1', port: 1234, path: '/myroute',
          user: 'username', pass: 'password',
          rootUri: 'amqps://username:password@192.168.1.1:1234'
        }
      }
    ].forEach(function(testCase) {
      it('should match ' + testCase.description, function() {
        var result = u.parseAddress(testCase.address);
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

  describe('#generateTimeouts', function() {
    it('should generate a fibonacci sequence of timeouts', function() {
      var options = {
        retries: 10,
        strategy: 'fibonacci',
      };

      var timeouts = u.generateTimeouts(options);
      expect(timeouts).to.eql(
        [0, 1, 1, 2, 3, 5, 8, 13, 21, 34].map(function(i) { return i * 1000; })
      );
    });

    it('should generate an exponential sequence of timeouts', function() {
      var options = {
        retries: 10,
        strategy: 'exponential',
      };

      var timeouts = u.generateTimeouts(options);
      expect(timeouts).to.eql(
        [1, 2, 4, 8, 16, 32, 64, 128, 256, 512].map(function(i) { return i * 1000; })
      );
    });
  });
});
