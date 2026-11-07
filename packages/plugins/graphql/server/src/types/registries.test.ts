// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type defaultConfig from '../config/default-config';
import type { services } from '../services';
import type { GraphQLConfig, TypeRegistry } from '.';

/** The keys a config must set: the optional keys have no default. */
type RequiredNames<T> = {
  [TKey in keyof T]-?: object extends Pick<T, TKey> ? never : TKey;
}[keyof T];

// The runtime maps implement exactly the registered contracts.
/* eslint-disable @typescript-eslint/no-unused-vars */
type ServiceNames = Core.Assert<
  Core.SameNames<
    keyof typeof services,
    keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::graphql'>
  >
>;
type DefaultConfigNames = Core.Assert<
  Core.SameNames<keyof typeof defaultConfig, RequiredNames<GraphQLConfig>>
>;
/* eslint-enable @typescript-eslint/no-unused-vars */

const registry = strapi.plugin('graphql').service('type-registry').new();
registry satisfies TypeRegistry;
registry.register('Custom', {}, { kind: 'types' }).has('Custom') satisfies boolean;
// @ts-expect-error A type that is not registered is `undefined`.
registry.get('Custom').name satisfies string;
// @ts-expect-error Registered services have no arbitrary members.
strapi.plugin('graphql').service('type-registry').missing();

const extension = strapi.service('plugin::graphql.extension');
extension.use({ resolversConfig: { 'Query.custom': { auth: false } } }) satisfies typeof extension;
extension.generate({ typeRegistry: registry }).typeDefs satisfies string[];
// @ts-expect-error `auth` is `false` or a route auth config.
extension.use({ resolversConfig: { 'Query.custom': { auth: true } } });
// @ts-expect-error Registered services have no arbitrary members.
extension.missing();

strapi.plugin('graphql').service('constants').KINDS.morph satisfies 'polymorphic';
// @ts-expect-error Registered services have no arbitrary members.
strapi.service('plugin::graphql.utils').missing();

const config = strapi.config.get('plugin::graphql');
config satisfies GraphQLConfig;
config.maxLimit satisfies number;
config.defaultLimit satisfies number | undefined;
// @ts-expect-error Registered configs have no arbitrary keys.
config.missing satisfies unknown;
const endpoint = strapi.plugin('graphql').config('endpoint');
endpoint satisfies string;
// @ts-expect-error Plugin-scoped lookups keep the registered value type.
strapi.plugin('graphql').config('shadowCRUD') satisfies string;
