'use strict';

var u = require('../utilities'),
    DefaultPolicy = require('./default_policy');

module.exports = u.deepMerge({
  defaultSubjects: false,

  connect: {
    options: {
      // By default ActiveMQ uses 30s for its idle timeout. The broker does not
      // seem to honor a change to this value from the client side, and also does
      // not send back that value as part of the handshake (it just returns
      // whatever value we sent, without honoring that value)
      idleTimeout: 30000,
    }
  }

}, DefaultPolicy);
