var Int64   = require('node-int64'),
    builder = require('buffer-builder'),
    Symbol  = require('./types/symbol');

function amqpify(arr) {
    var b = new builder();
    b.appendString('AMQP');
    for (var idx in arr) {
        b.appendUInt8(arr[idx]);
    }

    return b.get();
}

var constants = {
    // TODO: bit 5 should be protocol (e.g. PLAIN/SASL).
    defaultPort: 5672,
    defaultTlsPort: 5761,
    minMaxFrameSize: 512,
    defaultMaxFrameSize: 4294967295,
    defaultChannelMax: 65535,
    defaultIdleTimeout: 1000,
    requiredLocale: new Symbol('en-US'),
    defaultOutgoingLocales: new Symbol('en-US'),
    defaultIncomingLocales: new Symbol('en-US'),
    defaultHandleMax: 4294967295,
    amqpVersion: amqpify([0, 1, 0, 0]),
    saslVersion: amqpify([3, 1, 0, 0]),
    frameType: {
        amqp: 0x0, sasl: 0x1
    },
    saslOutcomes: {
        ok: 0,
        auth: 1,
        sys: 2,
        sys_perm: 3,
        sys_temp: 4,
        0: 'OK',
        1: 'Authentication failed due to issue with credentials',
        2: 'Authentication failed due to a system error',
        3: 'Authentication failed due to a permanent system error',
        4: 'Authentication failed due to a transient system error'
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
    },
    terminusDurability: {
        none: 0,
        configuration: 1,
        unsettledState: 2
    },
    terminusExpiryPolicy: {
        linkDetach: new Symbol('link-detach'),
        sessionEnd: new Symbol('session-end'),
        connectionClose: new Symbol('connection-close'),
        never: new Symbol('never')
    },
    distributionMode: {
        move: new Symbol('move'),
        copy: new Symbol('copy')
    },
    describedTypes: {
        source: {
            name: new Symbol('amqp:source:list'),
            code: new Int64(0x0, 0x28)
        },
        target: {
            name: new Symbol('amqp:target:list'),
            code: new Int64(0x0, 0x29)
        }
    }
};

module.exports = constants;
