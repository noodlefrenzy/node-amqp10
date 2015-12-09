'use strict';
var DefaultPolicy = require('./policies/default_policy'),
    pu = require('./policies/policy_utilities'),
    u = require('./utilities');

module.exports = {
  Client: require('./amqp_client'),
  Constants: require('./constants'),
  Errors: require('./errors'),
  Policy: {
    Default: DefaultPolicy,
    EventHub: require('./policies/event_hub_policy'),
    ServiceBusQueue: require('./policies/service_bus_queue_policy'),
    ServiceBusTopic: require('./policies/service_bus_topic_policy'),
    QpidJava: require('./policies/qpid_java_policy'),
    ActiveMQ: require('./policies/activemq_policy'),
    Utils: pu,
    merge: function(newPolicy, base) {
      return u.deepMerge(newPolicy, base || DefaultPolicy);
    }
  },
  Symbol: require('./types/amqp_symbol'),

  /**
   * translator, which allows you to translate from node-amqp-encoder'd
   * values into the internal types used in this library. (e.g.
   * [ 'symbol', 'symval' ] => Symbol('symval') ).
   */
  translator: require('./adapters/translate_encoder')
};
