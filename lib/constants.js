var Int64   = require('node-int64'),

    Symbol  = require('./types/symbol');

var constants = {
    // TODO: bit 5 should be protocol (e.g. PLAIN/SASL).
    defaultPort: 5672,
    defaultTlsPort: 5761,
    minMaxFrameSize: 512,
    defaultMaxFrameSize: 4294967295,
    defaultChannelMax: 65535,
    defaultIdleTimeout: 1000,
    defaultOutgoingLocales: new Symbol('en-US'),
    defaultIncomingLocales: new Symbol('en-US'),
    defaultHandleMax: 4294967295,
    amqpVersion: function() { var version = new Buffer([0,0,0,0,0,1,0,0]); version.write('AMQP', 0); return version; }(),
    frameType: {
        amqp: 0x0, sasl: 0x1
    },
    linkRole: {
        sender: false,
        receiver: true
    },
    senderSettleMode: {
        unsettled: 0,
        settled: 1,
        mixed: 2
    },
    receiverSettleMode: {
        autoSettle: 0,
        settleOnDisposition: 1
    }
};

module.exports = constants;
