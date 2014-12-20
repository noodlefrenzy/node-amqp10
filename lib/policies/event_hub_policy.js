var constants   = require('../constants'),
    u           = require('../utilities'),
    PolicyBase  = require('./policy_base');

module.exports = u.deepMerge({
    senderLinkPolicy: {
        options: {
            senderSettleMode: constants.senderSettleMode.settled,
            receiverSettleMode: constants.receiverSettleMode.autoSettle,
            maxMessageSize: 10000, // Arbitrary choice
            initialDeliveryCount: 1
        }
    },
    receiverLinkPolicy: {
        options: {
            senderSettleMode: constants.senderSettleMode.settled,
            receiverSettleMode: constants.receiverSettleMode.autoSettle,
            maxMessageSize: 10000, // Arbitrary choice
            initialDeliveryCount: 1
        }
    }
}, PolicyBase);
