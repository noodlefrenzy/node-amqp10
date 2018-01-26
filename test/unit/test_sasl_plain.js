'use strict';

var builder = require('buffer-builder'),
    SaslPlain = require('../../lib/sasl/sasl_plain'),

    tu = require('./../testing_utils'),
    expect = require('chai').expect;

describe('SaslPlain', function () {
  describe('getInitFrame', function () {
    it('should return a well formed content object', function (done) {
      var saslHandler = new SaslPlain();
      saslHandler.getInitFrame({ user: 'user', pass: 'pass' }).then(function (initContent) {
        expect(initContent.mechanism).to.equal('PLAIN');
        var expectedBuffer = tu.buildBuffer([0, builder.prototype.appendString, 'user', 0, builder.prototype.appendString, 'pass']);
        for(var i = 0; i < expectedBuffer.length; i++) {
          expect(initContent.initialResponse[i]).to.equal(expectedBuffer[i]);
        }
        done();
      });
    });
  });
});
