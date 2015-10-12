'use strict';

var u = require('../utilities'),
    DefaultPolicy = require('./default_policy');

module.exports = u.deepMerge({
  defaultSubjects: false,
  parseAddress: function(address) {
    var result = DefaultPolicy.parseAddress(address);

    // accept vhosts
    if (result.path !== '/') {
      var pathParts = result.path.substr(1).split('/');
      result.vhost = pathParts[0];
      result.path = pathParts.slice(1).join('/');
    }

    return result;
  }
}, DefaultPolicy);
