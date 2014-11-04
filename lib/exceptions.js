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

var EncodingError = function(msg) {
    this.message = 'Encoding failure: ' + msg;
    Error.captureStackTrace(this);
};

util.inherits(EncodingError, Error);

module.exports.EncodingError = EncodingError;

var ArgumentError = function(arg) {
    this.message = (arg instanceof Array) ? 'Must provide arguments ' + arg.join(', ') : 'Must provide argument ' + arg;
    Error.captureStackTrace(this);
};

util.inherits(ArgumentError, Error);

module.exports.ArgumentError = ArgumentError;

function assertArguments(options, argnames) {
    if (!argnames) return;
    if (!options) throw new ArgumentError(argnames);
    for (var idx in argnames) {
        var argname = argnames[idx];
        if (!options.hasOwnProperty(argname)) {
            throw new ArgumentError(argname);
        }
    }
}

module.exports.assertArguments = assertArguments;