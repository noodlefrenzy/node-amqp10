'use strict';
module.exports = {

  protocol: 'amqps',
  serviceBusHost: process.env.ServiceBusNamespace,
  senderLink: process.env.EventHubName,
  partitionSenderLinkPrefix: process.env.EventHubName + '/Partitions/',
  receiverLinkPrefix: process.env.EventHubName + '/ConsumerGroups/$default/Partitions/',
  partitionCount: process.env.EventHubPartitionCount,
  sasKeyName: process.env.EventHubKeyName,
  sasKey: process.env.EventHubKey,
  address: 'amqps' + '://' + encodeURIComponent(process.env.EventHubKeyName) + ':' + encodeURIComponent(process.env.EventHubKey) + '@' + process.env.ServiceBusNamespace + '.servicebus.windows.net'
};
