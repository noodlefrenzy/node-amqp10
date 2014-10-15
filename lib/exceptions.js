var util        = require('util');

var MalformedHeaderError = function(msg) {
    this.message = msg;
};

util.inherits(MalformedHeaderError, Error);

module.exports.MalformedHeaderError = MalformedHeaderError;

var NotImplementedError = function(msg) {
    this.message = msg;
};

util.inherits(NotImplementedError, Error);

module.exports.NotImplementedError = NotImplementedError;

var MalformedPayloadError = function(msg) {
    this.message = msg;
};

util.inherits(MalformedPayloadError, Error);

module.exports.MalformedPayloadError = MalformedPayloadError;