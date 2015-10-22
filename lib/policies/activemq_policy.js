'use strict';

var u = require('../utilities'),
    DefaultPolicy = require('./default_policy');

module.exports = u.deepMerge({
  defaultSubjects: false
}, DefaultPolicy);

