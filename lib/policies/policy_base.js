var constants   = require('../constants'),
    putils      = require('./policy_utilities');

function containerName() {
    var id = 1;
    return function() {
        return 'conn' + (id++);
    }
}

function linkName(prefix) {
    var id = 1;
    var pre = prefix;
    return function() {
        return pre + (id++);
    }
}

/**
 * Policies encode many of the optional behaviors and settings of AMQP into a cohesive place,
 * that could potentially be standardized, could be loaded from JSON, etc.
 */
module.exports = {
    connectPolicy: {
        options: {
            containerId: containerName(),
            hostname: 'localhost',
            maxFrameSize: constants.defaultMaxFrameSize,
            channelMax: constants.defaultChannelMax,
            idleTimeout: constants.defaultIdleTimeout,
            outgoingLocales: constants.defaultOutgoingLocales,
            incomingLocales: constants.defaultIncomingLocales,
            sslOptions: {
                keyFile: null,
                certFile: null,
                caFile: null,
                rejectUnauthorized: false
            }
        }
    },
    sessionPolicy: {
        options: {
            nextOutgoingId: constants.session.defaultOutgoingId,
            incomingWindow: constants.session.defaultIncomingWindow,
            outgoingWindow: constants.session.defaultOutgoingWindow
        },
        windowPolicy: putils.WindowPolicies.RefreshAtHalf,
        windowQuantum: constants.session.defaultIncomingWindow
    },
    senderLinkPolicy: {
        options: {
            name: linkName('sender'),
            role: constants.linkRole.sender,
            senderSettleMode: constants.senderSettleMode.settled,
            maxMessageSize: 10000, // Arbitrary choice
            initialDeliveryCount: 1
        }
    },
    receiverLinkPolicy: {
        options: {
            name: linkName('receiver'),
            role: constants.linkRole.receiver,
            receiverSettleMode: constants.receiverSettleMode.autoSettle,
            maxMessageSize: 10000 // Arbitrary choice
        },
        creditPolicy: putils.CreditPolicies.RefreshAtHalf,
        creditQuantum: 100
    }
};
