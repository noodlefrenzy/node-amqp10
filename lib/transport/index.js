'use strict';

var EventEmitter = require('events').EventEmitter;
var AbstractTransport = require('./abstract_transport.js');
var NetTransport = require('./net_transport.js');
var TlsTransport = require('./tls_transport.js');

function TransportProvider() {
  this._transports = {};
}

TransportProvider.prototype.registerTransport = function(protocol, transportFactory) {
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

   this._transports[protocol] = transport;
};

TransportProvider.prototype.getTransportFor = function(protocol) {
  if (!this._transports.hasOwnProperty(protocol))
    throw new Error('invalid protocol: ', protocol);

  return this._transports[protocol];
};

module.exports = (function() {
   var provider = new TransportProvider();

   // pre-register our "known" transports
   provider.registerTransport("amqp", function () { return new NetTransport(); });
   provider.registerTransport("amqps", function () { return new TlsTransport(); });
   return provider;
})();