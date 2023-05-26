import type * as Utils from '../utils';

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
export type Any = API | Plugin | Admin | Strapi | Global;

/**
 * Return a {@link Separator} based on the given {@link Any} ({@link DotSeparator} for {@link Scoped} and {@link ColonsSeparator} for regular ones)
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
export type GetSeparator<T extends Any = Any> = T extends Scoped
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
export type WithSeparator<N extends Any> = Utils.Suffix<N, GetSeparator<N>>;

/**
 * Represents namespaces composed of an origin and a name, separated by colons
 */
export type Scoped<O extends string = string, S extends string = string> = Any &
  `${O}${ColonsSeparator}${S}`;

/**
 * Extract the scope from the given scoped namespace
 */
export type ExtractScope<T> = T extends `${string}${ColonsSeparator}${infer S}` ? S : never;

/**
 * Extract the origin from the given scoped namespace
 */
export type ExtractOrigin<T> = T extends `${infer S}${ColonsSeparator}${string}` ? S : never;

/**
 * Separators used to join the different parts of a namespace (e.g. building a uid)
 */
export type Separator = ColonsSeparator | DotSeparator;

type ColonsSeparator = '::';
type DotSeparator = '.';
