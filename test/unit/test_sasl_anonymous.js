'use strict';

var SaslAnonymous = require('../../lib/sasl/sasl_anonymous'),
    expect = require('chai').expect;

describe('SaslAnonymous', function () {
  describe('getInitFrame', function () {
    it('should return a well formed content object', function (done) {
      var saslHandler = new SaslAnonymous();
      saslHandler.getInitFrame().then(function (initContent) {
        expect(initContent.mechanism).to.equal('ANONYMOUS');
        expect(initContent.initialResponse).to.be.instanceOf(Buffer);
        expect(initContent.initialResponse.length).to.equal(1);
        expect(initContent.initialResponse[0]).to.equal(0);
        done();
      });
    });
  });
});
