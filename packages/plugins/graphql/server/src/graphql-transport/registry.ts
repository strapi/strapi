import type {
  GraphqlTransportMountContext,
  GraphqlTransportMountResult,
  ResolvedGraphqlTransport,
} from './types';

/**
 * Mount the resolved GraphQL HTTP transport. Add new providers by branching here and implementing `mount*` in a dedicated module.
 */
export async function mountGraphqlTransport(
  resolved: ResolvedGraphqlTransport,
  ctx: GraphqlTransportMountContext
): Promise<GraphqlTransportMountResult> {
  if (resolved.provider === 'apollo' && resolved.version === 4) {
    const { mountApolloV4 } = await import('./apollo/apollo-v4');
    return mountApolloV4(ctx, resolved);
  }

  if (resolved.provider === 'apollo' && resolved.version === 5) {
    const { mountApolloV5 } = await import('./apollo/apollo-v5');
    return mountApolloV5(ctx, resolved);
  }

  throw new Error(
    `[@strapi/plugin-graphql] Unsupported GraphQL transport: ${JSON.stringify(resolved)}`
  );
}
