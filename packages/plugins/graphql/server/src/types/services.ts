import type * as nexus from 'nexus';
import type { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import type { IResolvers } from '@graphql-tools/utils';
import type { Core } from '@strapi/types';
import type createExtension from '../services/extension';
import type { Configuration, Extension } from '../services/extension/extension';

/**
 * A type stored by a type registry: `register` keeps the name, the definition and the config it
 * received (`services/type-registry.ts:34`).
 */
export type RegisteredTypeDefinition = {
  name: string;
  /** A Nexus type definition, or an object of them: `makeSchema` reads every definition. */
  definition: unknown;
  /** The registration config. Strapi's own types set `kind` and, for schema types, `contentType`. */
  config: Record<string, unknown>;
};

/** A type registry, as `plugin::graphql.type-registry`'s `new()` creates it (`services/type-registry.ts`). */
export type TypeRegistry = {
  /** Throws when `name` is already registered (`services/type-registry.ts:30-32`). */
  register(name: string, definition: unknown, config?: object): TypeRegistry;
  /** A config function is called with each entry's name and definition (`services/type-registry.ts:44-54`). */
  registerMany(
    definitionsEntries: [string, unknown][],
    config?: object | ((name: string, definition: unknown) => object)
  ): TypeRegistry;
  has(name: string): boolean;
  /** `undefined` for a name that is not registered: the registry is a `Map`. */
  get(name: string): RegisteredTypeDefinition | undefined;
  toObject(): Record<string, RegisteredTypeDefinition>;
  types: string[];
  definitions: RegisteredTypeDefinition[];
  where(predicate: (item: RegisteredTypeDefinition) => boolean): RegisteredTypeDefinition[];
};

/** The registered `type-registry` service. */
export type TypeRegistryService = {
  /** A method named `new`: unquoted, `new()` would declare a construct signature. */
  'new'(): TypeRegistry;
};

/**
 * A resolver middleware. Every function in `middlewares` is called with the next resolver and the
 * resolver arguments (`services/content-api/wrap-resolvers.ts:120-130`).
 */
export type ResolverMiddleware = (
  resolve: GraphQLFieldResolver<unknown, unknown>,
  parent: unknown,
  args: unknown,
  context: unknown,
  info: GraphQLResolveInfo
) => unknown;

/** The config of one resolver (`services/content-api/wrap-resolvers.ts`, `policy.ts`). */
export type ResolverConfig = {
  /**
   * `false` skips authentication. Otherwise the config is passed to `strapi.auth.verify`, which runs
   * for `Query`, `Mutation` and `Subscription` fields and any field with a config
   * (`wrap-resolvers.ts:137-148`).
   */
  auth?: Core.RouteConfig['auth'];
  /** Resolved without a plugin or API namespace (`policy.ts:9-10`): use global names or full UIDs. */
  policies?: Core.PolicyReference[];
  /**
   * Functions run as {@link ResolverMiddleware}. A name, or `{ name, options }`, resolves a registered
   * middleware (`wrap-resolvers.ts:38-62`).
   */
  middlewares?: Array<string | ResolverMiddleware | { name: string; options?: unknown }>;
};

/**
 * Resolver configs keyed by `<Type>.<field>` (`'Query.articles'`), or nested by type
 * (`{ Query: { articles } }`): the config is read with lodash `get` (`wrap-resolvers.ts:106`).
 */
export type ResolversConfig = Record<string, ResolverConfig | Record<string, ResolverConfig>>;

/** An extension configuration. `resolvers` are added to the schema with `addResolversToSchema`. */
export type ExtensionConfiguration = Omit<Configuration, 'resolvers' | 'resolversConfig'> & {
  resolvers?: IResolvers;
  resolversConfig?: ResolversConfig;
};

/**
 * An extension configuration factory, called with the type registry of the schema being built
 * (`services/content-api/index.ts:62`, `:122`).
 */
export type ExtensionConfigurationFactory = (options: {
  strapi: Core.Strapi;
  nexus: typeof nexus;
  typeRegistry: TypeRegistry;
}) => ExtensionConfiguration;

/** Every registered configuration, merged. */
export type GeneratedExtension = Omit<Extension, 'resolvers' | 'resolversConfig'> & {
  resolvers: IResolvers;
  resolversConfig: ResolversConfig;
};

type ExtensionImplementation = ReturnType<typeof createExtension>;

/**
 * The registered `extension` service. The implementation keeps its published `object` options, which
 * the contract types from their runtime use.
 */
export type ExtensionService = Omit<ExtensionImplementation, 'use' | 'generate'> & {
  use(configuration: ExtensionConfiguration | ExtensionConfigurationFactory): ExtensionService;
  generate(options: { typeRegistry: TypeRegistry }): GeneratedExtension;
};
