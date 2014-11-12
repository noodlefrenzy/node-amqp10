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
    requiredLocale: new Symbol('en-US'),
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
        },
        outcomes: {
            accepted: {
                name: new Symbol('amqp:accepted:list'),
                code: new Int64(0x0, 0x24)
            },
            rejected: {
                name: new Symbol('amqp:rejected:list'),
                code: new Int64(0x0, 0x25)
            },
            released: {
                name: new Symbol('amqp:released:list'),
                code: new Int64(0x0, 0x26)
            },
            modified: {
                name: new Symbol('amqp:modified:list'),
                code: new Int64(0x0, 0x27)
            }
        }
    }
};

module.exports = constants;
