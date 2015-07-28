'use strict';
var chai = require('chai');
chai.config.includeStack = true; // turn on stack traces

var config = {
  address: (process.env.SERVER ? 'amqp://'+process.env.SERVER  : 'amqp://localhost'),
  defaultLink: 'amq.topic'
};

module.exports = {
  config: config
};
