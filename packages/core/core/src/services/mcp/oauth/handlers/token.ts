import type { Core } from '@strapi/types';
import type { Context } from 'koa';
import { verifyS256Challenge } from '../utils/pkce';
import { sendOAuthError } from '../utils/oauth-errors';
import { authenticateClient } from '../utils/client-authentication';
import type { McpOAuthClient } from '../services/client-store';
import type { GrantTokens } from '../services/grant-session';
import { trimTrailingSlashes } from '../utils/url';
import type { McpOAuthHandlerDependencies } from './types';

const getBodyParam = (ctx: Context, name: string): string | undefined => {
  const body = ctx.request.body as Record<string, unknown> | undefined;
  const value = body?.[name];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const sendTokens = (ctx: Context, tokens: GrantTokens, accessTokenLifespan: number): void => {
  ctx.status = 200;
  ctx.body = {
    access_token: tokens.accessToken,
    token_type: 'Bearer',
    expires_in: accessTokenLifespan,
    refresh_token: tokens.refreshToken,
    ...(tokens.scope !== undefined ? { scope: tokens.scope } : {}),
  };
};

const handleAuthorizationCodeGrant = async (
  ctx: Context,
  client: McpOAuthClient,
  deps: McpOAuthHandlerDependencies
): Promise<void> => {
  const { config, codeStore, grantSessions } = deps;

  const code = getBodyParam(ctx, 'code');
  const redirectUri = getBodyParam(ctx, 'redirect_uri');
  const codeVerifier = getBodyParam(ctx, 'code_verifier');

  if (code === undefined) {
    return sendOAuthError(ctx, 400, 'invalid_request', 'Missing code');
  }

  const result = await codeStore.consume(code);

  if (result.status === 'not_found') {
    return sendOAuthError(ctx, 400, 'invalid_grant', 'Unknown authorization code');
  }

  if (result.status === 'replayed') {
    // OAuth 2.1 §4.1.2: a replayed code revokes every token issued from it.
    await grantSessions.revokeFamily(result.row.userId, result.row.grantId);
    return sendOAuthError(ctx, 400, 'invalid_grant', 'Authorization code already used');
  }

  const { row } = result;

  if (row.clientId !== client.clientId) {
    return sendOAuthError(
      ctx,
      400,
      'invalid_grant',
      'Authorization code was issued to another client'
    );
  }

  if (new Date(row.expiresAt) <= new Date()) {
    return sendOAuthError(ctx, 400, 'invalid_grant', 'Authorization code expired');
  }

  if (redirectUri === undefined || redirectUri !== row.redirectUri) {
    return sendOAuthError(ctx, 400, 'invalid_grant', 'redirect_uri does not match');
  }

  if (!verifyS256Challenge(codeVerifier, row.codeChallenge)) {
    return sendOAuthError(ctx, 400, 'invalid_grant', 'PKCE verification failed');
  }

  const resource = getBodyParam(ctx, 'resource');

  if (
    resource !== undefined &&
    trimTrailingSlashes(resource) !== (row.resource ?? config.resource)
  ) {
    return sendOAuthError(ctx, 400, 'invalid_target', 'Unknown resource');
  }

  const tokens = await grantSessions.issueGrant({
    userId: row.userId,
    grantId: row.grantId,
    clientId: client.clientId,
    ...(row.scope !== null ? { scope: row.scope } : {}),
    ...(row.resource !== null ? { resource: row.resource } : {}),
  });

  // Lazy cleanup of expired codes rides on successful exchanges.
  await codeStore.cleanupExpired();

  sendTokens(ctx, tokens, config.accessTokenLifespan);
};

const handleRefreshTokenGrant = async (
  ctx: Context,
  client: McpOAuthClient,
  deps: McpOAuthHandlerDependencies
): Promise<void> => {
  const { config, grantSessions } = deps;

  const refreshToken = getBodyParam(ctx, 'refresh_token');

  if (refreshToken === undefined) {
    return sendOAuthError(ctx, 400, 'invalid_request', 'Missing refresh_token');
  }

  const result = await grantSessions.refreshGrant(refreshToken, client.clientId);

  if ('error' in result) {
    return sendOAuthError(ctx, 400, 'invalid_grant', 'Invalid refresh token');
  }

  sendTokens(ctx, result, config.accessTokenLifespan);
};

/**
 * POST /mcp/oauth/token — RFC 6749 token endpoint with the authorization_code (PKCE) and
 * refresh_token grants.
 */
export const createTokenHandler =
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

    const grantType = getBodyParam(ctx, 'grant_type');

    switch (grantType) {
      case 'authorization_code':
        return handleAuthorizationCodeGrant(ctx, clientAuth.client, deps);
      case 'refresh_token':
        return handleRefreshTokenGrant(ctx, clientAuth.client, deps);
      default:
        return sendOAuthError(ctx, 400, 'unsupported_grant_type', 'Unsupported grant_type');
    }
  };
