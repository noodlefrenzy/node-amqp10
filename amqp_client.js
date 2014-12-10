var debug           = require('debug')('amqp10-client'),

    Connection      = require('./lib/connection'),
    Sasl            = require('./lib/sasl');

function AMQPClient() {

}

var EHAdapter = require('./lib/adapters/node_sbus').NodeSbusEventHubAdapter;

/**
 * Map of various adapters from other AMQP-reliant libraries to the interface herein.
 */
AMQPClient.adapters = {
    'NodeSbusEventHubAdapter': EHAdapter
};

var PolicyBase      = require('./lib/policies/policy_base'),
    EHPolicy        = require('./lib/policies/event_hub_policy').EventHubPolicy;

AMQPClient.policies = {
    'PolicyBase': PolicyBase,
    'EventHubPolicy': EHPolicy
};

module.exports = AMQPClient;
