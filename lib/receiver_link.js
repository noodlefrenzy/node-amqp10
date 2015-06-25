'use strict';

var util = require('util'),
    Link = require('./link');

function ReceiverLink(session, handle, linkPolicy) {
  ReceiverLink.super_.call(this, session, handle, linkPolicy);
}
util.inherits(ReceiverLink, Link);

module.exports = ReceiverLink;
