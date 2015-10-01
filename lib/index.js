'use strict';
var DefaultPolicy = require('./policies/default_policy'),
    EventHubPolicy = require('./policies/event_hub_policy'),
    ServiceBusQueuePolicy = require('./policies/service_bus_queue_policy'),
    ServiceBusTopicPolicy = require('./policies/service_bus_topic_policy'),
    Translator = require('./adapters/translate_encoder'),

    pu = require('./policies/policy_utilities'),
    u = require('./utilities');

module.exports = {
  Client: require('./amqp_client'),
  Constants: require('./constants'),
  Errors: require('./errors'),
  Policy: {
    Default: DefaultPolicy,
    EventHub: EventHubPolicy,
    ServiceBusQueue: ServiceBusQueuePolicy,
    ServiceBusTopic: ServiceBusTopicPolicy,
    Utils: pu,
    merge: function(newPolicy, base) {
      return u.deepMerge(newPolicy, base || DefaultPolicy);
    }
  },
  /**
   * Translator, which allows you to translate from node-amqp-encoder'd values into the
   * internal types used in this library.  (e.g. [ 'symbol', 'symval' ] => Symbol('symval') ).
   */
  Translator: Translator
};
