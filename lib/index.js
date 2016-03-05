'use strict';
var Policy = require('./policies/policy'),
    pu = require('./policies/policy_utilities');

module.exports = {
  Client: require('./amqp_client'),
  Constants: require('./constants'),
  Errors: require('./errors'),

  /**
   * Policies encode many of the optional behaviors and settings of AMQP into a
   * cohesive place that could potentially be standardized, could be loaded from
   * JSON, etc.
   */
  Policy: {
    PolicyBase: Policy,
    Default: new Policy(),
    EventHub: require('./policies/event_hub_policy'),
    ServiceBusQueue: require('./policies/service_bus_queue_policy'),
    ServiceBusTopic: require('./policies/service_bus_topic_policy'),
    QpidJava: require('./policies/qpid_java_policy'),
    ActiveMQ: require('./policies/activemq_policy'),
    Utils: pu,
    merge: function(overrides, base) { return pu.Merge(overrides, base || new Policy()); }
  },

  TransportProvider: require('./transport'),

  /**
   * translator, which allows you to translate from node-amqp-encoder'd
   * values into the internal types used in this library. (e.g.
   * [ 'symbol', 'symval' ] => Symbol('symval') ).
   */
  translator: require('./adapters/translate_encoder')
};
