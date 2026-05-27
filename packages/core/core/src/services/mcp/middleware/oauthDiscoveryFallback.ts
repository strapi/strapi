import type { Core } from '@strapi/types';

/**
 * OAuth discovery paths probed by MCP SDK clients during the authentication
 * fallback flow (RFC 8414 § 3, RFC 7591, OpenID Connect Discovery).
 *
 * Strapi is a resource server, not an authorization server, so these paths
 * have no real handler. Without this middleware, Koa returns plain-text
 * 404/405 responses that crash clients expecting JSON (e.g. Claude Code).
 *
 * The middleware only fires when downstream already returned 404 or 405,
 * so user-defined routes on these paths are never shadowed.
 */
const OAUTH_DISCOVERY_PROBES: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'GET', path: '/.well-known/oauth-authorization-server' },
  { method: 'GET', path: '/.well-known/openid-configuration' },
  { method: 'POST', path: '/register' },
];

export const createOAuthDiscoveryFallbackMiddleware = (): Core.MiddlewareHandler => {
  return async (ctx, next) => {
    await next();

    if (ctx.status !== 404 && ctx.status !== 405) {
      return;
    }

    const isOAuthProbe = OAUTH_DISCOVERY_PROBES.some(
      (probe) => ctx.method === probe.method && ctx.path === probe.path
    );

    if (isOAuthProbe === false) {
      return;
    }

    ctx.status = 404;
    ctx.set('Content-Type', 'application/json');
    ctx.body = { error: 'not_found', error_description: 'OAuth is not supported' };
  };
};
