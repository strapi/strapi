// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createBuilders from '../services/builders';
import type createInternals from '../services/internals';
import type createUtils from '../services/utils';
import type { TypeRegistry } from './services';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAssignable<T, U> = [T] extends [U] ? true : false;

type Builders = Strapi.Registries.PackageServices['plugin::graphql.builders'];
type BuildersUtils = Builders['utils'];
type Internals = Strapi.Registries.PackageServices['plugin::graphql.internals'];
type Utils = Strapi.Registries.PackageServices['plugin::graphql.utils'];
type Attributes = Utils['attributes'];
type Mappers = Utils['mappers'];

// The registered contracts of the graphql internal helpers carry no `any`: opaque values are
// `unknown`, and the code decides the other types. `builders.get` and
// `mappers.strapiScalarToGraphQLScalar` keep develop's `any`: their callers read the result as the
// builders and as a type name.
export type InternalsContractAssertions = [
  Expect<Equal<[Parameters<Builders['new']>], [[name: string, registry: TypeRegistry]]>>,
  Expect<
    Equal<[ReturnType<BuildersUtils['getContentTypeArgs']>], [Record<string, unknown> | undefined]>
  >,
  Expect<
    Equal<[ReturnType<BuildersUtils['scalarAttributesToFiltersMap']>], [Record<string, string>]>
  >,
  Expect<Equal<[Parameters<BuildersUtils['transformArgs']>[0]], [Record<string, unknown>]>>,
  Expect<Equal<[ReturnType<BuildersUtils['transformArgs']>], [Record<string, unknown>]>>,
  Expect<
    Equal<
      [ReturnType<Internals['buildInternalTypes']>['filters-input']],
      [{ scalars: Record<string, unknown> }]
    >
  >,
  Expect<Equal<[ReturnType<Attributes['isStrapiScalar']>], [boolean]>>,
  Expect<Equal<[ReturnType<Attributes['isGraphQLScalar']>], [boolean]>>,
  Expect<Equal<[Parameters<Attributes['isMedia']>], [[value: unknown]]>>,
  Expect<Equal<[Parameters<Attributes['isRelation']>], [[value: unknown]]>>,
  Expect<Equal<[Parameters<Attributes['isEnumeration']>], [[value: unknown]]>>,
  Expect<Equal<[Parameters<Attributes['isComponent']>], [[value: unknown]]>>,
  Expect<Equal<[Parameters<Attributes['isDynamicZone']>], [[value: unknown]]>>,
  Expect<Equal<[Parameters<Mappers['graphQLFiltersToStrapiQuery']>[0]], [unknown]>>,
  Expect<Equal<[ReturnType<Mappers['graphQLFiltersToStrapiQuery']>], [unknown]>>,
];

// The contracts override members the compiler does not check against the implementation: the
// implementation stays assignable to them.
export type InternalsImplementationAssertions = [
  Expect<IsAssignable<ReturnType<typeof createBuilders>, Builders>>,
  Expect<IsAssignable<ReturnType<typeof createInternals>, Internals>>,
  Expect<IsAssignable<ReturnType<typeof createUtils>, Utils>>,
];
