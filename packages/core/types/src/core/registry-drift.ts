/**
 * The prefix of the UIDs registered in a namespace, as the runtime builds them
 * (`packages/core/core/src/registries/namespace.ts:12-17`): a namespace ending with `::`, such as
 * `admin::`, is followed by the name; any other namespace, such as `plugin::upload`, by a dot.
 */
type NamespacePrefix<TNamespace extends string> = TNamespace extends `${string}::`
  ? TNamespace
  : `${TNamespace}.`;

/**
 * The entries of a registry under one namespace, keyed by their name without the namespace, the way
 * a package declares its runtime map: `services`, `controllers`.
 *
 * Packages register their runtime maps under their namespace (`registries/services.ts:69-81` and
 * `registries/controllers.ts:70-80` in `@strapi/core`), so a map key `locales` of the i18n plugin is
 * looked up as `plugin::i18n.locales`. Check a runtime map against its registered names with
 * `satisfies`:
 *
 * @example
 * ```ts
 * export default {
 *   locales,
 *   settings,
 * } satisfies Record<keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::i18n'>, unknown>;
 * ```
 *
 * A plain object literal is then checked both ways: a registered name without an implementation is a
 * missing property, an unregistered implementation an excess property. Spread properties escape the
 * excess property check: compare the names of such maps with {@link SameNames}.
 */
export type RegisteredFor<TRegistry, TNamespace extends string> = {
  [
    TKey in keyof TRegistry as TKey extends `${NamespacePrefix<TNamespace>}${infer TName}`
      ? TName
      : never
  ]: TRegistry[TKey];
};

/**
 * `true` when the runtime names `TActual` and the registered names `TExpected` are the same set.
 * Otherwise an object naming the drift: `unregistered` holds runtime names without a contract,
 * `unimplemented` registered names without a runtime entry. A map that leaks an index signature
 * reports `unregistered: string`. Use it with {@link Assert}.
 *
 * @example
 * ```ts
 * type Registered = keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::x'>;
 * // eslint-disable-next-line @typescript-eslint/no-unused-vars
 * type ServiceNames = Core.Assert<Core.SameNames<keyof typeof services, Registered>>;
 * ```
 */
export type SameNames<TActual extends PropertyKey, TExpected extends PropertyKey> = [
  Exclude<TActual, TExpected>,
  Exclude<TExpected, TActual>,
] extends [never, never]
  ? true
  : { unregistered: Exclude<TActual, TExpected>; unimplemented: Exclude<TExpected, TActual> };

/** Fails type checking, naming `T` in the error, unless `T` is `true`. See {@link SameNames}. */
export type Assert<T extends true> = T;
