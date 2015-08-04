'use strict';

var debug = require('debug')('amqp10-test-message-types'),
  expect = require('chai').expect,
  Int64 = require('node-int64'),

  M = require('../../lib/types/message'),
  tu = require('./testing_utils');

var buf = tu.buildBuffer;

describe('MessageTypes', function() {
  describe('Properties', function() {
    it('should encode user-id properly', function() {
      var props = new M.Properties({ userId: new Buffer(123) });
      expect(props.userId, 'From Buffer').to.be.an.instanceof(Buffer);

      props = new M.Properties({ userId: 123 });
      expect(props.userId, 'From int').to.be.an.instanceof(Buffer);

      props = new M.Properties({ userId: "123" });
      expect(props.userId, 'From string').to.be.an.instanceof(Buffer);

      props = new M.Properties({ userId: new Int64(12, 34)});
      expect(props.userId, 'From int64').to.be.an.instanceof(Buffer);
    });
  });
});
