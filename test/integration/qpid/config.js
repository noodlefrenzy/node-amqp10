'use strict';
var chai = require('chai');
chai.use(require('chai-string'));

module.exports = {
  address: (process.env.SERVER ? 'amqp://'+process.env.SERVER  : 'amqp://localhost'),
  defaultLink: 'amq.topic'
};
