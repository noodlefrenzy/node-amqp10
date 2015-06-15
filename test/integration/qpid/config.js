'use strict';
module.exports = {
  address: (process.env.SERVER ? 'amqp://'+process.env.SERVER  : 'amqp://localhost'),
  defaultLink: 'amq.topic'
};
