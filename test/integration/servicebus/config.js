'use strict';
module.exports = {

  protocol: 'amqps',
  serviceBusHost: process.env.SB_NAMESPACE,
  defaultLink: process.env.SB_QUEUENAME,
  sasKeyName: process.env.SB_KEYNAME,
  sasKey: process.env.SB_KEY,
  address: 'amqps' + '://' + encodeURIComponent(process.env.SB_KEYNAME) + ':' + encodeURIComponent(process.env.SB_KEY) + '@' + process.env.SB_NAMESPACE + '.servicebus.windows.net'
};
