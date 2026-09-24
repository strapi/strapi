import type { IsStrict } from './strictness';

/** Resolves application overrides before package defaults, then falls back to the legacy service. */
export type ServiceFor<TUID extends string> = IsStrict extends false
  ? Service
  : TUID extends keyof Strapi.Registries.AppServices
    ? Strapi.Registries.AppServices[TUID]
    : TUID extends keyof Strapi.Registries.PackageServices
      ? Strapi.Registries.PackageServices[TUID]
      : Service;

export type Service = {
  // TODO [V5] Consider changing the any value to unknown.
  // See: https://github.com/strapi/strapi/issues/16993 and https://github.com/strapi/strapi/pull/17020 for further information
  [key: keyof any]: any;
};
