import type { GraphQLSchema } from 'graphql';

import type { Core } from '@strapi/types';

export type ApolloGraphqlTransportVersion = 4 | 5;

/**
 * Resolved GraphQL HTTP transport after normalizing legacy and explicit `server` config.
 * Extend with additional `provider` unions when adding non-Apollo transports (e.g. tailcall).
 */
export interface ResolvedApolloGraphqlTransport {
  provider: 'apollo';
  version: ApolloGraphqlTransportVersion;
  /**
   * Options merged into ApolloServer (equivalent to legacy `apolloServer` merge in bootstrap).
   */
  apolloOptions: Record<string, unknown>;
}

export type ResolvedGraphqlTransport = ResolvedApolloGraphqlTransport;

export interface GraphqlTransportMountContext {
  strapi: Core.Strapi;
  schema: GraphQLSchema;
}

export interface GraphqlTransportMountResult {
  destroy: () => Promise<void>;
}
