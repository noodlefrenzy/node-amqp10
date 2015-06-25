'use strict';

var util = require('util'),
    Link = require('./link');

function SenderLink(session, handle, linkPolicy) {
  SenderLink.super_.call(this, session, handle, linkPolicy);
}
util.inherits(SenderLink, Link);

module.exports = SenderLink;
