// Type definitions for node-amqp10 v3
// Project: https://github.com/noodlefrenzy/node-amqp10
// Definitions by: Maxime LUCE <https://github.com/SomaticIT/>
// Definitions: https://github.com/typed-contrib/node-amqp10

import * as Policy from "./policy";
import Session = require("../session");
import Link = require("../link");

export type WindowPolicy = (session: Session) => void;

export const WindowPolicies: {
    RefreshAtHalf: WindowPolicy;
    RefreshAtEmpty: WindowPolicy;
    DoNotRefresh: WindowPolicy;
};

export type CreditPolicy = (link: Link, options?: any) => void;

export const CreditPolicies: {
    RefreshAtHalf: CreditPolicy;
    RefreshAtEmpty: CreditPolicy;
    RefreshSettled(treshold: number): CreditPolicy;
    DoNotRefresh: CreditPolicy;
};

export const SenderCallbackPolicies: {
    /** Only callback when settled Disposition received from recipient. */
    OnSettle: 'settled';
    
    /** Callback as soon as sent, will not call-back again if future disposition results in error. */
    OnSent: 'sent';
};

export function Merge(newPolicy: Policy.Overrides, base: Policy.Overrides): typeof newPolicy & typeof base;

/** Receiver links process messages N at a time, only renewing credits on ack. */
export function RenewOnSettle(initialCredit: number, treshold: number, basePolicy?: Policy.Overrides): Policy;