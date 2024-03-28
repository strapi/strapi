import type { String } from '../utils';

import type * as Namespace from './namespace';

type StringSuffix<T extends string> = String.Suffix<T, string>;

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
  TName extends string = string,
> = `${TCategory}.${TName}`;

/**
 * Represents a UID that can be used to reference a content-type or a component
 */
export type Schema = ContentType | Component;

/**
 * Represents any UID
 */
export type AnyUID = Service | Controller | Policy | Middleware | ContentType | Component;

/**
 * Type representation of every UID component.
 *
 * The separator type is automatically inferred from the given namespace
 */
export interface ParsedUID<
  TNamespace extends Namespace.AnyNamespace = Namespace.AnyNamespace,
  TName extends string = string,
> {
  raw: `${TNamespace}${Namespace.GetSeparator<TNamespace>}${TName}`;
  namespace: TNamespace;
  origin: TNamespace extends Namespace.Scoped ? Namespace.ExtractOrigin<TNamespace> : TNamespace;
  scope: TNamespace extends Namespace.Scoped ? Namespace.ExtractScope<TNamespace> : never;
  separator: Namespace.GetSeparator<TNamespace>;
  name: TName;
}

/**
 * Parse a UID literal and returns a {@link ParsedUID} type.
 *
 * Warning: Using ParseUID with a union type might produce undesired results as it'll distribute every matching namespace parsing to every union member
 *
 * @example
 * type T = ParseUID<'admin::foo'>
 * // ^ { namespace: 'admin'; separator: '::'; name: 'foo'; }
 *
 * type T = ParseUID<'api::foo.bar'>
 * // ^ { namespace: 'api::foo'; separator: '.'; name: 'bar'; }
 *
 * type T = ParseUID<'admin::foo' | 'api::foo.bar'>
 * // ^ { namespace: 'admin' | 'api::foo' ; separator: '.' | '::'; name: 'foo' | 'bar' | 'foo.bar'; }
 */
export type ParseUID<TUID extends AnyUID> =
  ExtractNamespace<TUID> extends infer TExtractedNamespace extends Namespace.AnyNamespace
    ? Namespace.GetSeparator<TExtractedNamespace> extends infer TSeparator extends
        Namespace.Separator
      ? TUID extends `${infer TInferredNamespace extends TExtractedNamespace}${TSeparator}${infer TName extends string}`
        ? ParsedUID<TInferredNamespace, TName>
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
export type EnsureNamespaceMatches<TUID extends AnyUID, TNamespace extends Namespace.AnyNamespace> =
  TUID extends StringSuffix<Namespace.WithSeparator<TNamespace>> ? TNamespace : never;

/**
 * Get parsed properties from a given raw UID
 */
export type GetUID<TUID extends AnyUID, TKey extends keyof ParsedUID> = ParseUID<TUID>[TKey];

/**
 * Pick parsed properties from a given raw UID
 *
 * @example
 * type T = SelectUID<'admin::foo', 'namespace' | 'name'>
 */
export type SelectUID<TUID extends AnyUID, TKey extends keyof ParseUID<TUID>> = Pick<
  ParseUID<TUID>,
  TKey
>;

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
export type ExtractNamespace<TUID extends AnyUID> =
  | EnsureNamespaceMatches<TUID, Namespace.Global>
  | EnsureNamespaceMatches<TUID, Namespace.Admin>
  | EnsureNamespaceMatches<TUID, Namespace.Strapi>
  | EnsureNamespaceMatches<TUID, Namespace.API>
  | EnsureNamespaceMatches<TUID, Namespace.Plugin>;
