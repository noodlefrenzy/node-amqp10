'use strict';
var AMQPClient  = require('../lib').Client,
    Promise = require('bluebird');


/**
 * Custom SASL handler object
 * It must implement 2 methods: getInitFrameContent and getChallengeResponseContent
 *
 * Both of these are described below.
 */
var customSaslHandler = {
  /**
   * Called by the SASL code from the library to get the content of the SASL-INIT frame to send to the server
   *
   * @returns {Promise}   A promise that will either be resolved with an object representing the content of a SASL-INIT frame or rejected with an error
   *                      The response object shall have 3 properties:
   *                          - 'mechanism' which is the name of the SASL mechanism being used (and must match the server's request)
   *                          - 'initialResponse' which is the response that the server is (hopefully) expecting.
   *                          - 'hostname' which is an optional hostname field you can use or let the library handle it.
   */
  getInitFrame: function () {
    return new Promise(function (resolve, reject) {
      var content = new Buffer('simulated custom SASL mechanism');
      // Note that the format of the response object below is also part of the API contract.
      // The properties of this object will be encoded in a SASL-INIT frame by the library.
      resolve({
        mechanism: '<SASL-MECHANISM-NAME>', // Use whatever name is sent by your server in the SASL-mechanisms frame.
        initialResponse: content,
        hostname: '<hostname>'
      });
      // or reject if you have a reason to.
    });
  },

  /**
   * Called by the SASL code from the library to get the response to a SASL-CHALLENGE from the server.
   *
   * @param   {Object}    challengeFrame    The content of the SASL-Challenge frame.
   * @returns {Promise}   A promise that will either be resolved with the challenge response or rejected with an error.
   *                      The challenge response is an object that must have a 'response' property and will be encoded in a SASL-RESPONSE frame.
   */
  getResponseFrame: function (challengeFrame) {
    return new Promise(function (resolve, reject) {
      // challengeFrame contains the whole content of the SASL-CHALLENGE frame - that depends on your SASL implementation
      // so it's up to you to decode it and figure out a response for it.
      var challengeResponse = new Buffer('challenge-response');
      resolve({ response: challengeResponse });
      // or reject if you have a reason to.
    });
  }
};

var client = new AMQPClient();
client.registerSaslMechanism('<SASL-MECHANISM-NAME>', customSaslHandler);
client.connect('uri', {
  saslMechanism: '<SASL-MECHANISM-NAME>' // you can also specify the SASL mechanism in the policy object when you create the client.
}).then(function () {
  // you are connected and the SASL exchange worked.
}).catch(function (err) {
  // failed to connect.
});