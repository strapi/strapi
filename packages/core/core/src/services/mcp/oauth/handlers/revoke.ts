import type { Core } from '@strapi/types';
import type { Context } from 'koa';
import { sendOAuthError } from '../utils/oauth-errors';
import { authenticateClient } from '../utils/client-authentication';
import type { McpOAuthHandlerDependencies } from './types';

const getBodyParam = (ctx: Context, name: string): string | undefined => {
  const body = ctx.request.body as Record<string, unknown> | undefined;
  const value = body?.[name];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * POST /mcp/oauth/revoke — RFC 7009 token revocation. Revoking either token of a grant
 * revokes the whole grant family. Unknown tokens still answer 200, per the RFC.
 */
export const createRevokeHandler =
  (deps: McpOAuthHandlerDependencies): Core.MiddlewareHandler =>
  async (ctx) => {
    ctx.set('Cache-Control', 'no-store');
    ctx.set('Pragma', 'no-cache');

    const clientAuth = await authenticateClient(ctx, deps.clientStore);

    if (!clientAuth.authenticated) {
      if (clientAuth.error === 'invalid_client') {
        ctx.set('WWW-Authenticate', 'Basic realm="mcp"');
        return sendOAuthError(ctx, 401, 'invalid_client', clientAuth.description);
      }

      return sendOAuthError(ctx, 400, clientAuth.error, clientAuth.description);
    }

    const token = getBodyParam(ctx, 'token');

    if (token === undefined) {
      return sendOAuthError(ctx, 400, 'invalid_request', 'Missing token');
    }

    await deps.grantSessions.revokeToken(token, clientAuth.client.clientId);

    ctx.status = 200;
    ctx.body = {};
  };
