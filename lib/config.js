/**
 * Configuration values, should be settable on creation of the overall AMQP client.
 * @todo Populate on client creation.
 *
 * @type Config
 */
module.exports = {
    max_number_of_channels: 10,
    idle_time_out_in_ms: 1000,
    incoming_locales: 'en-US',
    outgoing_locales: 'en-US',
    offered_capabilities: null,
    desired_capabilities: null
};