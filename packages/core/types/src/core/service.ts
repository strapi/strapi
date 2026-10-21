import type * as UID from '../uid';
import type * as InternalUID from '../internal/uid';
import type { SuggestedString } from '../utils/string';
import type { IsStrict, RegisteredRecord } from './strictness';
import type { Strapi } from './strapi';

/**
 * Resolves application overrides before package defaults. With strict types enabled, an unregistered
 * UID resolves to `unknown`, so callers pass a type argument; with strict types disabled, every UID
 * resolves to the legacy service.
 */
export type ServiceFor<TUID extends string> = IsStrict extends false
  ? Service
  : TUID extends keyof Strapi.Registries.AppServices
    ? Strapi.Registries.AppServices[TUID]
    : TUID extends keyof Strapi.Registries.PackageServices
      ? Strapi.Registries.PackageServices[TUID]
      : unknown;

/**
 * Return type of `strapi.service<T>(uid)`: `T` when the UID kept its wide default, which happens when
 * the caller passes an explicit type argument (TypeScript then does not infer the UID) or a dynamic
 * UID; the registered lookup otherwise.
 */
export type ServiceLookup<TUID extends ServiceLookupUID, T> = UID.Service extends TUID
  ? T
  : ServiceFor<TUID>;

/**
 * Service UIDs that have a registered contract. Registry keys outside the UID pattern, such as a UID
 * without its namespace, are ignored, so looking them up fails.
 */
export type RegisteredServiceUID = Extract<
  keyof Strapi.Registries.AppServices | keyof Strapi.Registries.PackageServices,
  InternalUID.Service
>;

/** A UID accepted by `strapi.service(uid)`. Registered UIDs are listed for completion. */
export type ServiceLookupUID = SuggestedString<RegisteredServiceUID, UID.Service>;

/**
 * Services keyed by UID, e.g. `strapi.services`. With strict types enabled, registered UIDs resolve to
 * their contracts. Other keys, literal or dynamic, resolve to the legacy service: an index signature
 * cannot close literal keys while keeping dynamic keys open, unlike `strapi.service(uid)`.
 */
export type ServiceMap = IsStrict extends false
  ? Record<string, Service>
  : RegisteredRecord<{ [TUID in RegisteredServiceUID]: ServiceFor<TUID> }, Service>;

/**
 * A UID accepted by {@link ServiceFactory}. With strict types enabled, only registered UIDs: a
 * factory checked against a UID without a contract would accept any service.
 */
export type ServiceFactoryUID = IsStrict extends false ? UID.Service : RegisteredServiceUID;

/**
 * A service factory, checked against the contract registered for `TUID`. The services registry calls
 * a function service once with `{ strapi }` and caches its result as the service
 * (`packages/core/core/src/registries/services.ts:33-36`), which `strapi.service(uid)` returns.
 *
 * With strict types disabled, the factory may return any service, as on develop.
 *
 * Type generation registers an application service with the `ServiceContract` type its module
 * exports (`types/generated/services.d.ts`), so the factory of that module can be checked against
 * its own UID. A module without that export registers the type its default export provides: a
 * factory checked against its own UID is then circular. When the checker reaches a lookup of the UID
 * before the factory, as in a controller that uses the service, the default export is implicitly
 * `any` (TS7022, silent without `noImplicitAny`) and so is the lookup. Keep a shared contract out of
 * `services/` and `controllers/`: the API loader registers every file there
 * (`packages/core/core/src/loaders/apis.ts:91-102`).
 *
 * A hand-declared `AppServices` entry for the same UID must be the identical type: a different one
 * is a conflicting declaration (TS2717, hidden by `skipLibCheck`).
 *
 * @example
 * ```ts
 * // src/api/invite/services/invite.ts
 * export type ServiceContract = { count(): Promise<number> };
 *
 * export default (({ strapi }) => ({
 *   async count() {
 *     return strapi.documents('api::invite.invite').count({});
 *   },
 * })) satisfies Core.ServiceFactory<'api::invite.invite'>;
 * ```
 */
export type ServiceFactory<TUID extends ServiceFactoryUID> = (params: {
  strapi: Strapi;
}) => ServiceFor<TUID>;

export type Service = {
  // TODO [V5] Consider changing the any value to unknown.
  // See: https://github.com/strapi/strapi/issues/16993 and https://github.com/strapi/strapi/pull/17020 for further information
  [key: keyof any]: any;
};
