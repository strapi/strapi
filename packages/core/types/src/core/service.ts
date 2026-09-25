import type * as Public from '../public';

/** Resolves application overrides before package defaults, then falls back to the legacy service. */
export type ServiceFor<TUID extends string> = TUID extends keyof Public.ServiceRegistry
  ? Public.ServiceRegistry[TUID]
  : TUID extends keyof Public.DefaultServiceRegistry
    ? Public.DefaultServiceRegistry[TUID]
    : Service;

export type Service = {
  // TODO [V5] Consider changing the any value to unknown.
  // See: https://github.com/strapi/strapi/issues/16993 and https://github.com/strapi/strapi/pull/17020 for further information
  [key: keyof any]: any;
};
