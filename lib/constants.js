var Int64   = require('node-int64'),

    Symbol  = require('./types/symbol');

var constants = {
    // TODO: bit 5 should be protocol (e.g. PLAIN/SASL).
    default_port: 5672,
    default_tls_port: 5761,
    min_max_frame_size: 512,
    defaultMaxFrameSize: 4294967295,
    defaultChannelMax: 65535,
    defaultIdleTimeout: 1000,
    defaultOutgoingLocales: new Symbol('en-US'),
    defaultIncomingLocales: new Symbol('en-US'),
    default_handle_max: 4294967295,
    amqp_version: function() { var version = new Buffer([0,0,0,0,0,1,0,0]); version.write('AMQP', 0); return version; }(),
    frame_type: {
        amqp: 0x0, sasl: 0x1
    },
    descriptor_code: 0x00
};

module.exports = constants;
