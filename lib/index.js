'use strict';
var DefaultPolicy = require('./policies/default_policy'),
    EventHubPolicy = require('./policies/event_hub_policy'),
    ServiceBusQueuePolicy = require('./policies/service_bus_queue_policy'),
    ServiceBusTopicPolicy = require('./policies/service_bus_topic_policy'),

    pu = require('./policies/policy_utilities'),
    u = require('./utilities');

module.exports = {
  Client: require('./amqp_client'),
  Constants: require('./constants'),
  Policy: {
    Default: DefaultPolicy,
    EventHub: EventHubPolicy,
    ServiceBusQueue: ServiceBusQueuePolicy,
    ServiceBusTopic: ServiceBusTopicPolicy,
    Utils: pu,
    merge: function(newPolicy, base) {
      return u.deepMerge(newPolicy, base || DefaultPolicy);
    }
  }
};
