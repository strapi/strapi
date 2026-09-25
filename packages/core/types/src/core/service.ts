import type * as UID from '../uid';
import type { IsDynamicName, IsStrict } from './strictness';

/**
 * Resolves application overrides before package defaults. With strict types enabled, an unregistered
 * literal UID resolves to `never`; with strict types disabled, every UID resolves to the legacy service.
 */
export type ServiceFor<TUID extends string> = IsStrict extends false
  ? Service
  : TUID extends keyof Strapi.Registries.AppServices
    ? Strapi.Registries.AppServices[TUID]
    : TUID extends keyof Strapi.Registries.PackageServices
      ? Strapi.Registries.PackageServices[TUID]
      : IsDynamicName<TUID> extends true
        ? // TODO @Nico decide whether dynamic names should also close in strict mode
          Service
        : never;

/**
 * Return type of `strapi.service<T>(uid)`: `T` when the UID kept its wide default, which happens when
 * the caller passes an explicit type argument (TypeScript then does not infer the UID) or a dynamic
 * UID; the registered lookup otherwise.
 */
export type ServiceLookup<TUID extends UID.Service, T> = UID.Service extends TUID
  ? T
  : ServiceFor<TUID>;

export type Service = {
  // TODO [V5] Consider changing the any value to unknown.
  // See: https://github.com/strapi/strapi/issues/16993 and https://github.com/strapi/strapi/pull/17020 for further information
  [key: keyof any]: any;
};
