import type * as UID from './uid';

/**
 * Extract valid keys from a given registry.
 *
 * It looks for {@link UID.Any} by default but the search can be narrowed to any UID subset using the `U` generic.
 *
 * @example
 * interface Registry {
 *   'foo': unknown;
 *   'default.foo': 'unknown';
 *   'global::foo': unknown;
 *   'api::foo.bar': unknown;
 * }
 *
 * type T = Keys<Registry>;
 * // ^ 'default.foo' | 'global::foo' | 'api::foo.bar'
 * type T = Keys<Registry, UID.Policy>;
 * // ^ 'global::foo' | 'api::foo.bar'
 * type T = Keys<Registry, UID.Service>
 * // ^ 'api::foo.bar'
 */
export type Keys<R, U extends UID.Any = UID.Any> = Extract<keyof R, U>;

/**
 * Performs a `Q` filtering operation on the given `T` registry.
 *
 * `Q` needs to be a partial representation of a {@link UID.Parsed}
 *
 * Note: For additional filtering, the registry keys' type can be passed as the third generic.
 *
 * @example
 * interface Registry {
 *   'admin::foo': unknown;
 *   'admin::bar': unknown;
 *   'api::foo.bar': unknown;
 *   'api::foo.baz': unknown;
 *   'api::bar.foo': unknown;
 *   'plugin::foo.bar': unknown;
 * }
 *
 * type T = keyof WhereKeys<Registry, { namespace: Namespace.API }>;
 * // ^ "api::foo.bar" | "api::foo.baz" | "api::bar.foo"
 *
 * type T = keyof WhereKeys<Registry, { name: 'bar' }>;
 * // ^ "admin::bar" | "api::foo.bar" | "plugin::foo.bar"
 *
 * type T = keyof WhereKeys<Registry, { separator: '.' }>;
 * // ^ "api::foo.bar" | "api::foo.baz" | "api::bar.foo" | 'plugin::foo.bar"
 *
 * type T = keyof WhereKeys<Registry, { namespace: Namespace.Plugin | Namespace.Admin }>;
 * // ^ "plugin::foo.bar" | "admin::foo" | "admin::bar"
 *
 * type T = keyof WhereKeys<Registry, { namespace: Namespace.API; name: Utils.Contains<'b'> }>;
 * // ^ "api::foo.bar" | "api::foo.baz"
 */
export type WhereKeys<T, Q extends Partial<UID.Parsed>, U extends UID.Any = UID.Any> = {
  [uid in Keys<T, U> as UID.Parse<uid> extends Q ? uid : never]: T[uid];
};
