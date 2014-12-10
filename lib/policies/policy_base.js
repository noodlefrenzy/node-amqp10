var u           = require('../utilities'),
    constants   = require('../constants');

/**
 * Policies encode many of the optional behaviors and settings of AMQP into a cohesive place,
 * that could potentially be standardized, could be loaded from JSON, etc.
 *
 * @constructor
 */
function PolicyBase(policyOverrides) {
    var overrides = policyOverrides || {};
    this.connectPolicy = overrides.connectPolicy || {};
    this.connectPolicy.options = u.orDefaults(this.connectPolicy.options, {
        containerId: (PolicyBase._containerIdCnt++).toString(),
        hostname: 'localhost',
        idleTimeout: 120000
    });
    this.sessionPolicy = overrides.sessionPolicy || {};
    this.sessionPolicy.options = u.orDefaults(this.sessionPolicy.options, {
        nextOutgoingId: constants.session.defaultOutgoingId,
        incomingWindow: constants.session.defaultIncomingWindow,
        outgoingWindow: constants.session.defaultOutgoingWindow
    });
    this.linkPolicy = overrides.linkPolicy || {};
    // No default link options at the moment
    this.linkPolicy.options = u.orDefaults(this.linkPolicy.options, {
    });
}

module.exports = PolicyBase;

PolicyBase._containerIdCnt = 1;
