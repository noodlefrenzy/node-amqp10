'use strict';
var Policy = require('./policies/policy'),
    Client = require('./amqp_client'),
    pu = require('./policies/policy_utilities'),
    types = require('./types');

module.exports = {
  Client: Client,
  Constants: require('./constants'),
  Errors: require('./errors'),
  Type: types.Type,

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
  AbstractTransport: require('./transport/abstract_transport'),
  DescribedType: require('./types/described_type'),

  /**
   * translator, which allows you to translate from node-amqp-encoder'd
   * values into the internal types used in this library. (e.g.
   * [ 'symbol', 'symval' ] => Symbol('symval') ).
   */
  translator: require('./adapters/translate_encoder'),

  /**
   * Syntactic sugar for pluggable amqp10 Client behaviors
   */
  use: function(plugin) {
    if (typeof plugin !== 'function') {
      throw new Error('Plugin is not a function');
    }

    plugin(Client);
  }
};
