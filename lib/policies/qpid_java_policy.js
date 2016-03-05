'use strict';
var Policy = require('./policy'),
    util = require('util');

function QpidJavaPolicy() {
  Policy.call(this, {
    defaultSubjects: false
  });
}
util.inherits(QpidJavaPolicy, Policy);

var _parseAddress = Policy.prototype.parseAddress;
QpidJavaPolicy.prototype.parseAddress = function(address) {
  var result = _parseAddress(address);

  // accept vhosts
  if (result.path !== '/') {
    var pathParts = result.path.substr(1).split('/');
    result.vhost = pathParts[0];
    result.path = '/' + pathParts.slice(1).join('/');
  }

  return result;
};

module.exports = new QpidJavaPolicy();
