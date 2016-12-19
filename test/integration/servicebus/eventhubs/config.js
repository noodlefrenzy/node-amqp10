'use strict';
var tu = require('../../../testing_utils.js');

module.exports = tu.populateConfig({
  serviceBusHost: 'EventHubNamespace',
  senderLink: 'EventHubName',
  partitionCount: 'EventHubPartitionCount',
  sasKeyName: 'EventHubKeyName',
  sasKey: 'EventHubKey'
}, function(err, config) {
  if (!!err) return err;
  config.protocol = 'amqps';
  config.address = config.protocol + '://' +
    encodeURIComponent(config.sasKeyName) + ':' + encodeURIComponent(config.sasKey) +
      '@' + config.serviceBusHost + '.servicebus.windows.net';

  config.partitionSenderLinkPrefix = config.senderLink + '/Partitions/';
  config.receiverLinkPrefix = config.senderLink + '/ConsumerGroups/$default/Partitions/';
  return config;
});
