var util        = require('util'),

    PolicyBase  = require('./policy_base');

function EventHubPolicy(policyOverrides) {
    EventHubPolicy.super_.call(this, policyOverrides);
}

util.inherits(EventHubPolicy, PolicyBase);

module.exports.EventHubPolicy = EventHubPolicy;

module.exports.DefaultEventHubPolicy = new EventHubPolicy();
