import type { ResolvedGraphqlTransport } from '../graphql-transport/types';

const isNonEmptyObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.keys(value as object).length > 0;

/**
 * Normalize legacy `apolloServer` and optional `server` block into a resolved transport.
 *
 * - Legacy-only configs (no `server`) → Apollo v4 with `apolloOptions` from `apolloServer`.
 * - Explicit `server` → `server.options` used for Apollo; legacy `apolloServer` is ignored with a warning if it was non-empty.
 */
export function resolveGraphqlServerConfig(
  pluginConfig: Record<string, unknown>,
  log?: { warn: (msg: string) => void }
): ResolvedGraphqlTransport {
  const apolloServerLegacy = pluginConfig.apolloServer;
  const server = pluginConfig.server as Record<string, unknown> | undefined;

  if (server !== undefined && server !== null && typeof server === 'object') {
    if (isNonEmptyObject(apolloServerLegacy)) {
      log?.warn(
        '[graphql] `apolloServer` is ignored when `server` is set. Use `server.options` for Apollo-specific settings.'
      );
    }

    const provider = server.provider;
    if (provider === 'apollo') {
      const version = server.version === 5 ? 5 : 4;
      const options =
        server.options !== undefined &&
        typeof server.options === 'object' &&
        server.options !== null
          ? (server.options as Record<string, unknown>)
          : {};
      return {
        provider: 'apollo',
        version,
        apolloOptions: options,
      };
    }

    if (provider === 'tailcall') {
      throw new Error(
        '[@strapi/plugin-graphql] `server.provider: "tailcall"` is not supported yet. Remove it or use a future release that includes this transport.'
      );
    }

    throw new Error(
      `[@strapi/plugin-graphql] Unknown graphql server provider: ${String(provider)}. Use "apollo" or omit \`server\` for the default Apollo v4 setup.`
    );
  }

  const apolloOptions =
    typeof apolloServerLegacy === 'object' && apolloServerLegacy !== null
      ? { ...(apolloServerLegacy as Record<string, unknown>) }
      : {};

  return {
    provider: 'apollo',
    version: 4,
    apolloOptions,
  };
}
