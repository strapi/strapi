import type * as Namespace from './namespace';
import type * as Utils from '../utils';

type StringSuffix<T extends string> = Utils.Suffix<T, string>;

/**
 * Template for services' unique identifier
 */
export type Service = StringSuffix<
  | Namespace.WithSeparator<Namespace.Admin>
  | Namespace.WithSeparator<Namespace.API>
  | Namespace.WithSeparator<Namespace.Plugin>
>;

/**
 * Template for controllers' unique identifier
 */
export type Controller = StringSuffix<
  | Namespace.WithSeparator<Namespace.Admin>
  | Namespace.WithSeparator<Namespace.API>
  | Namespace.WithSeparator<Namespace.Plugin>
>;

/**
 * Template for policies' unique identifier
 */
export type Policy = StringSuffix<
  | Namespace.WithSeparator<Namespace.Admin>
  | Namespace.WithSeparator<Namespace.Strapi>
  | Namespace.WithSeparator<Namespace.Global>
  | Namespace.WithSeparator<Namespace.API>
  | Namespace.WithSeparator<Namespace.Plugin>
>;

/**
 * Template for middlewares' unique identifier
 */
export type Middleware = StringSuffix<
  | Namespace.WithSeparator<Namespace.Admin>
  | Namespace.WithSeparator<Namespace.Strapi>
  | Namespace.WithSeparator<Namespace.Global>
  | Namespace.WithSeparator<Namespace.API>
  | Namespace.WithSeparator<Namespace.Plugin>
>;

/**
 * Template for content-types' unique identifier
 */
export type ContentType = StringSuffix<
  | Namespace.WithSeparator<Namespace.Admin>
  | Namespace.WithSeparator<Namespace.Strapi>
  | Namespace.WithSeparator<Namespace.API>
  | Namespace.WithSeparator<Namespace.Plugin>
>;

/**
 * Template for components' unique identifier
 *
 * Warning: Can cause overlap with other UID formats.
 */
export type Component = `${string}.${string}`;

/**
 * Represents any UID
 */
export type Any = Service | Controller | Policy | Middleware | ContentType | Component;

/**
 * Type representation of every UID component.
 *
 * The separator type is automatically inferred from the given namespace
 */
export interface Parsed<N extends Namespace.Any = Namespace.Any, E extends string = string> {
  raw: `${N}${Namespace.GetSeparator<N>}${E}`;
  namespace: N;
  origin: N extends Namespace.Scoped ? Namespace.ExtractOrigin<N> : N;
  scope: N extends Namespace.Scoped ? Namespace.ExtractScope<N> : never;
  separator: Namespace.GetSeparator<N>;
  name: E;
}

/**
 * Parse a UID literal and returns a {@link Parsed} type.
 *
 * Warning: Using ParseUID with a union type might produce undesired results as it'll distribute every matching namespace parsing to every union member
 *
 * @example
 * type T = Parse<'admin::foo'>
 * // ^ { namespace: 'admin'; separator: '::'; name: 'foo'; }
 *
 * type T = Parse<'api::foo.bar'>
 * // ^ { namespace: 'api::foo'; separator: '.'; name: 'bar'; }
 *
 * type T = Parse<'admin::foo' | 'api::foo.bar'>
 * // ^ { namespace: 'admin' | 'api::foo' ; separator: '.' | '::'; name: 'foo' | 'bar' | 'foo.bar'; }
 */
export type Parse<U extends Any> = ExtractNamespace<U> extends infer B extends Namespace.Any
  ? Namespace.GetSeparator<B> extends infer S extends Namespace.Separator
    ? U extends `${infer N extends B}${S}${infer E extends string}`
      ? Parsed<N, E>
      : never
    : never
  : never;

/**
 * Determines if the UID's namespace matches the given one.
 *
 * It returns N (the {@link Namespace.Any} literal) if there is a match, never otherwise.
 *
 * @example
 * type T = EnsureNamespaceMatches<'admin::foo', Namespace.Admin>
 * // ^ Namespace.Admin
 * @example
 * type T = EnsureNamespaceMatches<'foo.bar', Namespace.API>
 * // ^ never
 * @example
 * type T = EnsureNamespaceMatches<'api::foo.bar', Namespace.Plugin>
 * // ^ never
 */
export type EnsureNamespaceMatches<U extends Any, N extends Namespace.Any> = U extends StringSuffix<
  Namespace.WithSeparator<N>
>
  ? N
  : never;

/**
 * Get parsed properties from a given raw UID
 */
export type Get<U extends Any, P extends keyof Parsed> = Parse<U>[P];

/**
 * Pick parsed properties from a given raw UID
 */
export type Select<U extends Any, P extends keyof Parse<U>> = Pick<Parse<U>, P>;

/**
 * Extract the namespace literal from a given UID.
 *
 * @example
 * type T = ExtractNamespace<'admin::foo'>
 * // ^ Namespace.Admin
 * @example
 * type T = ExtractNamespace<'api::foo.bar'>
 * // ^ Namespace.API
 * @example
 * type T = ExtractNamespace<'admin::foo' | 'api::foo.bar'>
 * // ^ Namespace.Admin | Namespace.API
 */
export type ExtractNamespace<U extends Any> =
  | EnsureNamespaceMatches<U, Namespace.Global>
  | EnsureNamespaceMatches<U, Namespace.Admin>
  | EnsureNamespaceMatches<U, Namespace.Strapi>
  | EnsureNamespaceMatches<U, Namespace.API>
  | EnsureNamespaceMatches<U, Namespace.Plugin>;
