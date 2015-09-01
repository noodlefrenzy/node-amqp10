'use strict';
module.exports = {

  protocol: 'amqps',
  serviceBusHost: process.env.ServiceBusNamespace,
  defaultLink: process.env.ServiceBusQueueName,
  sasKeyName: process.env.ServiceBusQueueKeyName,
  sasKey: process.env.ServiceBusQueueKey,
  address: 'amqps' + '://' + encodeURIComponent(process.env.ServiceBusQueueKeyName) + ':' + encodeURIComponent(process.env.ServiceBusQueueKey) + '@' + process.env.ServiceBusNamespace + '.servicebus.windows.net'
};
