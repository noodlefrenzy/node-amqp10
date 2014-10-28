var util        = require('util');

var MalformedHeaderError = function(msg) {
    this.message = 'Malformed header: ' + msg;
    Error.captureStackTrace(this);
};

util.inherits(MalformedHeaderError, Error);

module.exports.MalformedHeaderError = MalformedHeaderError;

var NotImplementedError = function(msg) {
    this.message = msg + ' not yet implemented';
    Error.captureStackTrace(this);
};

util.inherits(NotImplementedError, Error);

module.exports.NotImplementedError = NotImplementedError;

var MalformedPayloadError = function(msg) {
    this.message = 'Malformed payload: ' + msg;
    Error.captureStackTrace(this);
};

util.inherits(MalformedPayloadError, Error);

module.exports.MalformedPayloadError = MalformedPayloadError;