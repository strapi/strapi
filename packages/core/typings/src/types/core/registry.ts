import type * as UID from './uid';

/**
 * Extract valid keys from a given registry.
 *
 * It looks for {@link UID.Any} by default but the search can be narrowed to any UID subset using the `TUidFormat` generic.
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
export type Keys<TRegistry, TUidFormat extends UID.Any = UID.Any> = Extract<
  keyof TRegistry,
  TUidFormat
>;

/**
 * Performs a `TQuery` filtering operation on the given `TRegistry` registry.
 *
 * `TQuery` needs to be a partial representation of a {@link UID.Parsed}
 *
 * Note: For additional filtering, the registry keys' type can be passed as the third parameter.
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
 * type T = keyof WhereKeys<Registry, { namespace: Namespace.API; name: Utils.Includes<'b'> }>;
 * // ^ "api::foo.bar" | "api::foo.baz"
 */
export type WhereKeys<
  TRegistry,
  TQuery extends Partial<UID.Parsed>,
  TUidFormat extends UID.Any = UID.Any
> = {
  [uid in Keys<TRegistry, TUidFormat> as UID.Parse<uid> extends TQuery
    ? uid
    : never]: TRegistry[uid];
};
