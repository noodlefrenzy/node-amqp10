'use strict';
var Policy = require('../../lib/policies/policy'),
    expect = require('chai').expect,
    u = require('../../lib/utilities'),
    tu = require('./../testing_utils');

describe('Utilities', function() {
  describe('#bufferEquals()', function() {
    it('should succeed when equal', function() {
      var b1 = tu.buildBuffer([1, 2, 3, 4]);
      var b2 = tu.buildBuffer([1, 2, 3, 4]);
      expect(u.bufferEquals(b1, b2)).to.be.true;
    });
    it('should return false quickly on unequal size buffers', function() {
      // Ideally, I'd use two huge buffers, set the timeout low, and ensure the test passes in the time allotted,
      //  but that's (a) a pain, and (b) prone to sporadic failures, so just ensuring it at least gives the right answer.
      var b1 = tu.buildBuffer([1]);
      var b2 = tu.buildBuffer([1, 2]);
      expect(u.bufferEquals(b1, b2)).to.be.false;
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

    it('should work with Buffers', function() {
      var merged = u.deepMerge({}, { test: new Buffer([0xDE, 0xAD, 0xBE, 0xEF]) });
      expect(merged.test).to.eql(new Buffer([0xDE, 0xAD, 0xBE, 0xEF]));
    });

    // @todo Fix deepMerge to preserve object __proto__ identity.
    // it('should work for nested with custom types', function() {
    //   var nested = { foo: { bar: new AMQPSymbol('s1') } };
    //   var defaults = { foo: { baz: new AMQPSymbol('s2') }, bat: new AMQPSymbol('s3') };
    //   var merged = u.deepMerge(nested, defaults);
    //   expect(merged.bat).to.be.an.instanceOf(AMQPSymbol);
    //   expect(merged.foo.bar).to.be.an.instanceOf(AMQPSymbol);
    //   expect(merged.foo.baz).to.be.an.instanceOf(AMQPSymbol);
    // });

    // it('should work for described types', function() {
    //   var dt = new DescribedType(new AMQPSymbol('keyname'), 'value string');
    //   var merged = u.deepMerge({ options: dt });
    //   expect(merged.options).to.be.an.instanceOf(DescribedType);
    //   expect(merged.options.descriptor).to.be.an.instanceOf(AMQPSymbol);
    //   expect(merged.options.descriptor.contents).to.eql('keyname');
    //   expect(merged.options.value).to.eql('value string');
    // });

    /*
    NOTE: this isn't used for attach frames anymore, need to determine if this
          test is still needed
    it('should work for attach frame details', function() {
      var input = { options: {
        name: 'recv',
        role: constants.linkRole.receiver,
        source: new terminus.Source({
          address: 'recv',
          filter: new Fields({
            'apache.org:selector-filter:string' :
                new DescribedType(new AMQPSymbol('apache.org:selector-filter:string'),
                    "amqp.annotation.x-opt-offset > '" + 1000 + "'")
            })
        }),
        target: new terminus.Target({
          address: 'localhost'
        }),
        sndSettleMode: constants.senderSettleMode.settled,
        rcvSettleMode: constants.receiverSettleMode.autoSettle,
        maxMessageSize: 10000,
        initialDeliveryCount: 1
      }};

      var merged = u.deepMerge(input);
      expect(merged).to.eql(input);
    });
    */

    it('should work for chains', function() {
      var last = { a: 1, b: 1, c: 1 };
      var middle = { b: 2, c: 2 };
      var first = { c: 3 };
      var merged = u.deepMerge(first, middle, last);
      expect(merged).to.eql({ a: 1, b: 2, c: 3 });
    });
  });

  describe('#parseLinkAddress', function() {
    [
      {
        description: 'a simple link name',
        address: 'amq.topic',
        expected: { name: 'amq.topic' }
      },
      {
        description: 'link name with subject',
        address: 'amq.topic/news',
        expected: { name: 'amq.topic', subject: 'news' }
      }
    ].forEach(function(testCase) {
      it('should match ' + testCase.description, function() {
        var policy = new Policy();
        var result = policy.parseLinkAddress(testCase.address);
        expect(result).to.eql(testCase.expected);
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
