import type * as Namespace from './namespace';
import type * as Utils from '../utils';

type StringSuffix<T extends string> = Utils.String.Suffix<T, string>;

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
 * @example
 * 'default.foo' extends Component => true (T = 'default', N = 'foo')
 *
 * @example
 * // /!\ Warning: Can cause overlap with other UID formats:
 * // 'api::foo.bar' both extends ContentType and Component
 * 'api::foo.bar' extends ContentType => true (N = 'api', S='::', T='foo')
 * 'api::foo.bar' extends Component   => true (T = 'api::foo', N = 'bar')
 */
export type Component<
  TCategory extends string = string,
  TName extends string = string
> = `${TCategory}.${TName}`;

/**
 * Represents any UID
 */
export type Any = Service | Controller | Policy | Middleware | ContentType | Component;

/**
 * Type representation of every UID component.
 *
 * The separator type is automatically inferred from the given namespace
 */
export interface Parsed<
  TNamespace extends Namespace.Any = Namespace.Any,
  TName extends string = string
> {
  raw: `${TNamespace}${Namespace.GetSeparator<TNamespace>}${TName}`;
  namespace: TNamespace;
  origin: TNamespace extends Namespace.Scoped ? Namespace.ExtractOrigin<TNamespace> : TNamespace;
  scope: TNamespace extends Namespace.Scoped ? Namespace.ExtractScope<TNamespace> : never;
  separator: Namespace.GetSeparator<TNamespace>;
  name: TName;
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
export type Parse<TUid extends Any> =
  ExtractNamespace<TUid> extends infer TExtractedNamespace extends Namespace.Any
    ? Namespace.GetSeparator<TExtractedNamespace> extends infer TSeparator extends Namespace.Separator
      ? TUid extends `${infer TInferredNamespace extends TExtractedNamespace}${TSeparator}${infer TName extends string}`
        ? Parsed<TInferredNamespace, TName>
        : never
      : never
    : never;

/**
 * Determines if the UID's namespace matches the given one.
 *
 * It returns TNamespace (the {@link Namespace.Any} literal) if there is a match, never otherwise.
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
export type EnsureNamespaceMatches<
  TUid extends Any,
  TNamespace extends Namespace.Any
> = TUid extends StringSuffix<Namespace.WithSeparator<TNamespace>> ? TNamespace : never;

/**
 * Get parsed properties from a given raw UID
 */
export type Get<TUid extends Any, TKey extends keyof Parsed> = Parse<TUid>[TKey];

/**
 * Pick parsed properties from a given raw UID
 */
export type Select<TUid extends Any, TKey extends keyof Parse<TUid>> = Pick<Parse<TUid>, TKey>;

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
export type ExtractNamespace<TUid extends Any> =
  | EnsureNamespaceMatches<TUid, Namespace.Global>
  | EnsureNamespaceMatches<TUid, Namespace.Admin>
  | EnsureNamespaceMatches<TUid, Namespace.Strapi>
  | EnsureNamespaceMatches<TUid, Namespace.API>
  | EnsureNamespaceMatches<TUid, Namespace.Plugin>;
