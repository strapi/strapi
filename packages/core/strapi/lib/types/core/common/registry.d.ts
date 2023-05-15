import { UID, ParsedUID, ParseUID } from './uid';

/**
 * Extract valid keys from a given registry.
 *
 * It looks for {@link UID} by default but the search can be narrowed to any UID subset using the `U` generic.
 *
 * @example
 * interface Registry {
 *   'foo': unknown;
 *   'default.foo': 'unknown';
 *   'global::foo': unknown;
 *   'api::foo.bar': unknown;
 * }
 *
 * type T = RegistryKeysBy<Registry>;
 * // ^ 'default.foo' | 'global::foo' | 'api::foo.bar'
 * type T = RegistryKeysBy<Registry, BasePolicyUID>;
 * // ^ 'global::foo' | 'api::foo.bar'
 * type T = RegistryKeysBy<Registry, BaseServiceUID>
 * // ^ 'api::foo.bar'
 */
export type RegistryKeysBy<R, U extends UID = UID> = Extract<keyof R, U>;

/**
 * Performs a `Q` filtering operation on the given `T` registry.
 *
 * `Q` needs to be a partial representation of a {@link ParsedUID}
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
 * type T = keyof RegistryQuery<Registry, { namespace: ApiNamespace }>;
 * // ^ "api::foo.bar" | "api::foo.baz" | "api::bar.foo"
 *
 * type T = keyof RegistryQuery<Registry, { name: 'bar' }>;
 * // ^ "admin::bar" | "api::foo.bar" | "plugin::foo.bar"
 *
 * type T = keyof RegistryQuery<Registry, { separator: '.' }>;
 * // ^ "api::foo.bar" | "api::foo.baz" | "api::bar.foo" | 'plugin::foo.bar"
 *
 * type T = keyof RegistryQuery<Registry, { namespace: PluginNamespace | AdminNamespace }>;
 * // ^ "plugin::foo.bar" | "admin::foo" | "admin::bar"
 *
 * type T = keyof RegistryQuery<Registry, { namespace: ApiNamespace; name: Contains<'b'> }>;
 * // ^ "api::foo.bar" | "api::foo.baz"
 */
export type RegistryQuery<T, Q extends Partial<ParsedUID>, U extends UID = UID> = {
  [uid in RegistryKeysBy<T, U> as ParseUID<uid> extends Q ? uid : never]: T[uid];
};
