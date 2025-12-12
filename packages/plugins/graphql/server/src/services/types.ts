import type { GraphQLResolveInfo } from 'graphql';
import type { Core } from '@strapi/types';
import type { TypeRegistry } from './type-registry';

export type Context = {
  strapi: Core.Strapi;
  registry: TypeRegistry;
};

/**
 * GraphQL resolver context type for custom resolvers.
 *
 * This context is passed to all GraphQL resolvers and includes:
 * - `state`: Koa state (auth info, route info)
 * - `koaContext`: Reference to the Koa context for HTTP access
 * - `rootQueryArgs`: Arguments from the root query (for nested resolvers)
 * - `graphql.defaultResolve`: Function to call the default resolver (useful for data loader patterns)
 */
export type StrapiGraphQLResolverContext = {
  state: any;
  koaContext: any;
  rootQueryArgs?: Record<string, unknown>;
  graphql?: {
    /**
     * Call the default resolver for this field.
     * Useful for data loader patterns where you want to fall back to the default behavior.
     *
     * @example
     * ```typescript
     * const cachedResult = await myDataLoader.load(args);
     * if (cachedResult) return cachedResult;
     * return context.graphql.defaultResolve(parent, args, context, info);
     * ```
     */
    defaultResolve: (
      parent?: unknown,
      args?: unknown,
      context?: unknown,
      info?: GraphQLResolveInfo
    ) => unknown;
  };
};
