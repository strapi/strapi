import type { String } from '../utils';

/**
 * Namespace for admin resources
 */
export type Admin = 'admin';

/**
 * Namespace for strapi internal resources
 */
export type Strapi = 'strapi';

/**
 * Namespace for scoped APIs resources
 */
export type API<T extends string = string> = `api${ColonsSeparator}${T}`;

/**
 * Namespace for scoped plugins resources
 */
export type Plugin<T extends string = string> = `plugin${ColonsSeparator}${T}`;

/**
 * Namespace for global resources
 */
export type Global = 'global';

/**
 * Represents any namespace
 */
export type AnyNamespace = API | Plugin | Admin | Strapi | Global;

/**
 * Return a {@link Separator} based on the given {@link AnyNamespace} ({@link DotSeparator} for {@link Scoped} and {@link ColonsSeparator} for regular ones)
 *
 * @example
 * type S = GetSeparator<Admin>
 * // ^ '::'
 *
 * type S = GetSeparator<API>
 * // ^ '.'
 *
 * type S = GetSeparator<Admin | API>
 * // ^ '.' | '::'
 */
export type GetSeparator<TNamespace extends AnyNamespace = AnyNamespace> = TNamespace extends Scoped
  ? // 'api::foo' | 'plugin::bar' => '.'
    DotSeparator
  : // 'admin' | 'strapi' | 'global' => '::'
    ColonsSeparator;

/**
 * Adds the corresponding separator (using {@link GetSeparator}) at the end of a namespace
 *
 * Warning: Using WithSeparator with a union type might produce undesired results as it'll distribute every matching suffix to every union member
 *
 * @example
 * type T = WithSeparator<Admin>
 * // ^ 'admin::'
 *
 * type T = WithSeparator<API>
 * // ^ 'api::{string}.'
 *
 * type T = WithSeparator<Admin | API>
 * // ^ 'admin::' | 'admin.' | 'api::{string}.' | 'api::{string}::'
 *
 * type T = WithSeparator<Admin> | WithSeparator<API>
 * // ^ 'admin::' | 'api::{string}.'
 */
export type WithSeparator<TNamespace extends AnyNamespace> = String.Suffix<
  TNamespace,
  GetSeparator<TNamespace>
>;

/**
 * Represents namespaces composed of an origin and a scope, separated by colons
 */
export type Scoped<TOrigin extends string = string, TScope extends string = string> = AnyNamespace &
  `${TOrigin}${ColonsSeparator}${TScope}`;

/**
 * Extract the scope from the given scoped namespace
 */
export type ExtractScope<TNamespace> =
  TNamespace extends `${string}${ColonsSeparator}${infer TScope}` ? TScope : never;

/**
 * Extract the origin from the given scoped namespace
 */
export type ExtractOrigin<TNamespace> =
  TNamespace extends `${infer TOrigin}${ColonsSeparator}${string}` ? TOrigin : never;

/**
 * Separators used to join the different parts of a namespace (e.g. building a uid)
 */
export type Separator = ColonsSeparator | DotSeparator;

type ColonsSeparator = '::';
type DotSeparator = '.';
