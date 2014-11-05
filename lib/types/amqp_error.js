var Int64           = require('node-int64'),
    util            = require('util'),

    DescribedType   = require('./described_type'),
    Symbol          = require('./symbol');

var AMQPError = function(condition, description, info) {
    AMQPError.super_.call(this, AMQPError.Descriptor, [ condition, description || '', info || {} ]);
    this.condition = condition;
    this.description = description;
    this.errorInfo = info;
};

util.inherits(AMQPError, DescribedType);

AMQPError.Descriptor = new Int64(0x0, 0x1D);

AMQPError.fromDescribedType = function(describedType) {
    return new AMQPError(describedType.value[0], describedType.value[1], describedType.value[2]);
};

module.exports = AMQPError;