/**
 * Policies encode many of the optional behaviors and settings of AMQP into a cohesive place,
 * that could potentially be standardized, could be loaded from JSON, etc.
 *
 * @constructor
 */
function PolicyBase(policyOverrides) {
    this.connectPolicy = {

    };
    this.sessionPolicy = {

    };
    this.linkPolicy = {

    };
}

module.exports = PolicyBase;
