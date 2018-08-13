
import Connection = require("../connection");
import { SaslMechanism, Credentials, SaslHandler } from  "./sasl_utils";

declare class Sasl {

  mechanism: SaslMechanism | string;
  handler: SaslHandler;
  receivedHeader: boolean;

  constructor(mechanism: SaslMechanism | string, handler: SaslHandler);

  negotiate(connection: Connection, credentials: Credentials, callback: Function): void;

  headerReceived(header: any): void;
}
export = Sasl;