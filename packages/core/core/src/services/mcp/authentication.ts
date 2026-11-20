import type { Core, Data } from '@strapi/types';
import type { Ability } from '@casl/ability';
import type { Context } from 'koa';

export type McpAdminTokenAbility = Ability;

export type McpAuthFailureReason = 'missing_token' | 'invalid_token';

export type McpAdminTokenAuthResult =
  | { authenticated: false; reason: McpAuthFailureReason; error?: Error }
  | {
      authenticated: true;
      credentials: { id: Data.ID };
      user: { id: Data.ID };
      ability: McpAdminTokenAbility;
    };

const extractBearerToken = (ctx: Context): string | null => {
  const authorization = ctx.request.header.authorization;

  if (authorization === undefined) {
    return null;
  }

  const parts = authorization.split(/\s+/);

  if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
    return null;
  }

  return parts[1];
};

export type McpAuthenticationStrategy = {
  authenticate(ctx: Context): Promise<McpAdminTokenAuthResult>;
};

export type McpOAuthAccessTokenAuthenticator = {
  authenticate(token: string): Promise<McpAdminTokenAuthResult>;
};

/**
 * Admin API tokens are long random hex strings and can never contain a dot, while OAuth
 * access tokens are JWTs, which always contain two. The dispatch is therefore unambiguous.
 */
const isJwtShaped = (token: string): boolean => token.split('.').length === 3;

/**
 * Dispatches /mcp bearer tokens to the admin API token authenticator or, when MCP OAuth is
 * enabled, to the OAuth access token authenticator.
 */
export const createMcpAuthenticationStrategy = (
  strapi: Core.Strapi,
  options: {
    isOAuthEnabled: () => boolean;
    oauthAuthenticator: McpOAuthAccessTokenAuthenticator;
  }
): McpAuthenticationStrategy => {
  const adminTokenAuthenticator = createMcpAdminTokenAuthenticator(strapi);

  return {
    async authenticate(ctx: Context): Promise<McpAdminTokenAuthResult> {
      const token = extractBearerToken(ctx);

      if (token === null) {
        return { authenticated: false, reason: 'missing_token' };
      }

      if (options.isOAuthEnabled() && isJwtShaped(token)) {
        return options.oauthAuthenticator.authenticate(token);
      }

      return adminTokenAuthenticator.authenticate(ctx);
    },
  };
};

export const createMcpAdminTokenAuthenticator = (strapi: Core.Strapi) => ({
  async authenticate(ctx: Context): Promise<McpAdminTokenAuthResult> {
    const token = extractBearerToken(ctx);

    if (token === null) {
      return { authenticated: false, reason: 'missing_token' };
    }

    const authResult = (await strapi.admin.services['api-token-admin'].authenticateAdminToken(
      token
    )) as McpAdminTokenAuthResult;

    if (authResult.authenticated === false) {
      return {
        authenticated: false,
        reason: 'invalid_token',
        error: authResult.error,
      };
    }

    return {
      authenticated: true,
      credentials: { id: authResult.credentials.id },
      user: { id: authResult.user.id },
      ability: authResult.ability,
    };
  },
});
