import { Credentials } from  "./sasl_utils";

declare class SaslPlain {

  getInitFrame(credentials: Credentials): Promise<any>;
}

export = SaslPlain;