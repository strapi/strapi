/** Resolves application overrides before package defaults, then falls back to the legacy service. */
export type ServiceFor<TUID extends string> = TUID extends keyof Strapi.Registries.Services
  ? Strapi.Registries.Services[TUID]
  : TUID extends keyof Strapi.Registries.DefaultServices
    ? Strapi.Registries.DefaultServices[TUID]
    : Service;

export type Service = {
  // TODO [V5] Consider changing the any value to unknown.
  // See: https://github.com/strapi/strapi/issues/16993 and https://github.com/strapi/strapi/pull/17020 for further information
  [key: keyof any]: any;
};
