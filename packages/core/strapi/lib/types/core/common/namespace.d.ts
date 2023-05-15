import type { AddSuffix, NonEmpty } from '../../utils';

/**
 * Namespace for admin resources
 */
export type AdminNamespace = 'admin';

/**
 * Namespace for strapi internal resources
 */
export type StrapiNamespace = 'strapi';

/**
 * Namespace for scoped APIs resources
 */
export type ApiNamespace<T extends string = string> = `api::${T}`;

/**
 * Namespace for scoped plugins resources
 */
export type PluginNamespace<T extends string = string> = `plugin::${T}`;

/**
 * Namespace for global resources
 */
export type GlobalNamespace = 'global';

/**
 * Represents any namespace
 */
export type Namespace =
  | ApiNamespace
  | PluginNamespace
  | AdminNamespace
  | StrapiNamespace
  | GlobalNamespace;

/**
 * Return a {@link Separator} based on the given {@link Namespace} ({@link DotSeparator} for {@link ScopedNamespace} and {@link ColonsSeparator} for regular ones)
 *
 * @example
 * type S = GetNamespaceSeparator<AdminNamespace>
 * // ^ '::'
 *
 * type S = GetNamespaceSeparator<ApiNamespace>
 * // ^ '.'
 *
 * type S = GetNamespaceSeparator<AdminNamespace | ApiNamespace>
 * // ^ '.' | '::'
 */
export type GetNamespaceSeparator<T extends Namespace = Namespace> = T extends ScopedNamespace
  ? // 'api::foo' | 'plugin::bar' => '.'
    DotSeparator
  : // 'admin' | 'strapi' | 'global' => '::'
    ColonsSeparator;

/**
 * Adds the corresponding separator (using {@link GetNamespaceSeparator}) at the end of a namespace
 *
 * Warning: Using WithSeparator with a union type might produce undesired results as it'll distribute every matching suffix to every union members
 *
 * @example
 * type T = WithSeparator<AdminNamespace>
 * // ^ 'admin::'
 *
 * type T = WithSeparator<ApiNamespace>
 * // ^ 'api::{string}.'
 *
 * type T = WithSeparator<AdminNamespace | ApiNamespace>
 * // ^ 'admin::' | 'admin.' | 'api::{string}.' | 'api::{string}::'
 *
 * type T = WithSeparator<AdminNamespace> | WithSeparator<ApiNamespace>
 * // ^ 'admin::' | 'api::{string}.'
 */
export type WithSeparator<N extends Namespace> = AddSuffix<N, GetNamespaceSeparator<N>>;

/**
 * Represents namespaces composed of an origin and a name, separated by colons
 */
export type ScopedNamespace<O extends string = string, S extends string = string> = Namespace &
  `${O}${ColonsSeparator}${S}`;

/**
 * Extract the scope from the given scoped namespace
 */
export type ExtractNamespaceScope<T> = T extends `${string}${ColonsSeparator}${infer S}`
  ? S
  : never;

/**
 * Extract the origin from the given scoped namespace
 */
export type ExtractNamespaceOrigin<T> = T extends `${infer S}${ColonsSeparator}${string}`
  ? S
  : never;

/**
 * Separators used to join the different parts of a namespace (e.g. building a uid)
 */
export type Separator = ColonsSeparator | DotSeparator;

type ColonsSeparator = '::';
type DotSeparator = '.';
