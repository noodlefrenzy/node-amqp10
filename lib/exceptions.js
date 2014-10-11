var util        = require('util');

var MalformedHeaderError = function(msg) {
    this.message = msg;
};

util.interits(MalformedHeaderError, Error);

module.exports.MalformedHeaderError = MalformedHeaderError;
