var util        = require('util'),

    constants   = require('../constants'),
    u           = require('../utilities'),
    PolicyBase  = require('./policy_base');

function EventHubPolicy(policyOverrides) {
    EventHubPolicy.super_.call(this, policyOverrides);
    this.linkPolicy.options = u.orDefaults(this.linkPolicy.options, {
        senderSettleMode: constants.senderSettleMode.settled,
        receiverSettleMode: constants.receiverSettleMode.autoSettle,
        maxMessageSize: 10000, // Arbitrary choice
        initialDeliveryCount: 1
    });
}

util.inherits(EventHubPolicy, PolicyBase);

module.exports.EventHubPolicy = EventHubPolicy;

module.exports.DefaultEventHubPolicy = new EventHubPolicy();
