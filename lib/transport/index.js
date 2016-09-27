'use strict';

var EventEmitter = require('events').EventEmitter;
var AbstractTransport = require('./abstract_transport.js');
var NetTransport = require('./net_transport.js');
var TlsTransport = require('./tls_transport.js');

function TransportProvider() {
  this._transportFactories = {};
}

var verifyImplementation = function (transportFactory) {
  // NOTE: if we only cared about internal modules, 'instanceof' would work, but
  // since we're "duck typing" transports to avoid circular dependencies, we have to
  // verify the transport prototype differently.

  var transport = transportFactory();
  for(var member in AbstractTransport.prototype) {
    if (AbstractTransport.prototype.hasOwnProperty(member))
      if (typeof AbstractTransport.prototype[member] !== typeof transport[member]) {
        throw new Error('transport should implement the \'' + member + '\' method.');
      }
  }

  if (!(transport instanceof EventEmitter))
  {
    throw new Error('transport should inherit from EventEmitter');
  }
};

TransportProvider.prototype.registerTransport = function(protocol, transportFactory) {
  verifyImplementation(transportFactory);
  this._transportFactories[protocol] = transportFactory;
};

TransportProvider.prototype.getTransportFor = function(protocol) {
  if (!this._transportFactories.hasOwnProperty(protocol))
    throw new Error('invalid protocol: ', protocol);

  return this._transportFactories[protocol]();
};

module.exports = (function() {
  var provider = new TransportProvider();

  // pre-register our "known" transports
  NetTransport.register(provider);
  TlsTransport.register(provider);
  return provider;
})();
