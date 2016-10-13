'use strict';

var expect = require('chai').expect,
    errors = require('../../lib/errors'),
    util = require('util'),
    AbstractTransport = require('../../lib/transport/abstract_transport');

function MockTransport() { AbstractTransport.call(this); }
util.inherits(MockTransport, AbstractTransport);

describe('Transport', function() {
  it('should not allow creation of an AbstractTransport', function() {
    expect(function() { new AbstractTransport(); }).to.throw(errors.TransportError);
  });

  it('should throw on AbstractTransport.register', function() {
    expect(function() { AbstractTransport.register(); }).to.throw(errors.TransportError);
  });

  it('should throw on unimplemented, required methods', function() {
    var transport = new MockTransport();
    expect(function() { transport.connect(); }).to.throw(errors.TransportError);
    expect(function() { transport.write(); }).to.throw(errors.TransportError);
    expect(function() { transport.end(); }).to.throw(errors.TransportError);
    expect(function() { transport.destroy(); }).to.throw(errors.TransportError);
  });

}); // Frames

