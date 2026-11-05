import type { IsStrict } from './strictness';
import type { Strapi } from './strapi';

type LooseFunction<T> = T extends (...args: infer TArgs) => unknown
  ? (...args: { [K in keyof TArgs]: any }) => any
  : never;

/** `TContract` with every parameter and result `any`: a function, or each member of an object. */
type Loose<TContract> = [LooseFunction<TContract>] extends [never]
  ? {
      [K in keyof TContract]: [LooseFunction<TContract[K]>] extends [never]
        ? any
        : LooseFunction<TContract[K]>;
    }
  : LooseFunction<TContract>;

/**
 * What an implementation `satisfies` to be checked against its contract. With strict types
 * enabled, the contract itself: unannotated parameters take the contract's types, and members,
 * parameters and results are checked. With strict types disabled, the same member names with `any`
 * parameters and results, so the emitted declaration keeps the implementation's own types.
 *
 * Use it after `satisfies` only. An annotation (`const x: Core.Implements<C>`) publishes the type
 * itself instead of the implementation's.
 *
 * @example
 * export const formatComponent = ((component) => ({ … })) satisfies Core.Implements<ComponentsService['formatComponent']>;
 */
export type Implements<TContract> = IsStrict extends false ? Loose<TContract> : TContract;

/**
 * A package's service factory, checked against the contract registered for `TUID` in
 * `Strapi.Registries.PackageServices`. A `Core.Licensed` entry (`Contract | undefined`) is checked
 * against `Contract`.
 *
 * @example
 * export default (({ strapi }: { strapi: Core.Strapi }) => ({ … })) satisfies Core.ServiceImplementation<'plugin::review-workflows.validation'>;
 */
export type ServiceImplementation<TUID extends keyof Strapi.Registries.PackageServices> = (params: {
  strapi: Strapi;
}) => Implements<NonNullable<Strapi.Registries.PackageServices[TUID]>>;
