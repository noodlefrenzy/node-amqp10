declare enum SaslMechanism {
  PLAIN = 'PLAIN',
  ANONYMOUS = 'ANONYMOUS',
  NONE = 'NONE'
}

declare interface Credentials {
  user: string;
  pass: string;
}

declare interface SaslHandler {
  /**
   * Gets the content of the SASL-INIT frame to send to the server
   *
   * @returns {Promise<{mechanism: string; initialResponse: any; hostname?: string}>} 
   * A promise that will either be resolved with an object representing the content of a SASL-INIT frame or rejected with an error
   * The response object shall have 3 properties:
   *   - 'mechanism' which is the name of the SASL mechanism being used (and must match the server's request)
   *   - 'initialResponse' which is the response that the server is (hopefully) expecting.
   *   - 'hostname' which is an optional hostname field you can use or let the library handle it.
   */
  getInitFrame(): Promise<{mechanism: string; initialResponse: any; hostname?: string}>;

  /**
   * Gets the response to a SASL-CHALLENGE from the server.
   *
   * @param   {Object}    challengeFrame    The content of the SASL-Challenge frame.
   * @returns {Promise}   A promise that will either be resolved with the challenge response or rejected with an error.
   *                      The challenge response is an object that must have a 'response' property and will be encoded in a SASL-RESPONSE frame.
   */
  getResponseFrame(challengeFrame: any): Promise<{response: any; [x: string]: any}>;
}

export { SaslMechanism, Credentials, SaslHandler };