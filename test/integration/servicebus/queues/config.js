'use strict';
var tu = require('../../../testing_utils.js');

module.exports = tu.populateConfig({
  serviceBusHost: 'ServiceBusNamespace',
  defaultLink: 'ServiceBusQueueNames',
  sasKeyName: 'ServiceBusQueueKeyNames',
  sasKey: 'ServiceBusQueueKeys'
}, function(config) {
  config.protocol = 'amqps';
  config.address = config.protocol + '://' +
    encodeURIComponent(config.sasKeyName) + ':' + encodeURIComponent(config.sasKey) +
      '@' + config.serviceBusHost + '.servicebus.windows.net';
  return config;
});
