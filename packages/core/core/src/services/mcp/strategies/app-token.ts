import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import { isNil } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Ability } from '../internal/McpServerFactory';

const { UnauthorizedError } = errors;

/**
 * Extract bearer token from request header
 */
const extractToken = (ctx: Context) => {
  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    const parts = ctx.request.header.authorization.split(/\s+/);

    if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
      return null;
    }

    return parts[1];
  }

  return null;
};

/**
 * Create app-token authentication strategy with injected Strapi instance
 */
export const createAppTokenStrategy = (
  strapi: Core.Strapi
): {
  name: 'app-token';
  authenticate: (ctx: Context) => Promise<
    | { authenticated: false; error?: Error }
    | {
        authenticated: true;
        credentials: {
          token: { id: string; expiresAt: number | null };
          user: { id: number | string };
        };
        ability: Ability;
      }
  >;
  verify: (auth: { credentials: { token: { expiresAt: number } } }) => void;
} => {
  /**
   * Verify the token has the required abilities for the requested scope
   * For MCP, we do capability-level gating, so this is mostly a sanity check
   */
  return {
    name: 'app-token',
    /**
     * Authenticate the validity of the app token
     */
    async authenticate(ctx) {
      // Access admin service through strapi.admin
      const appTokenService = strapi.admin.services['app-token'];
      const token = extractToken(ctx);

      if (!token) {
        return { authenticated: false };
      }

      const appToken = await appTokenService.getBy({
        accessKey: appTokenService.hash(token),
      });

      // token not found
      if (!appToken) {
        return { authenticated: false };
      }

      const currentDate = new Date();

      // Check expiration
      if (!isNil(appToken.expiresAt)) {
        const expirationDate = new Date(appToken.expiresAt);
        // token has expired
        if (expirationDate < currentDate) {
          return { authenticated: false, error: new UnauthorizedError('Token expired') };
        }
      }

      // Update lastUsedAt
      await strapi.db.query('admin::app-token').update({
        where: { id: appToken.id },
        data: { lastUsedAt: currentDate },
      });

      // Ensure the user is active
      const user = appToken.user;
      if (!user || !(user.isActive === true)) {
        return { authenticated: false };
      }

      // Compute effective ability (intersection of user role + token allowlist)
      const effectiveAbility = await appTokenService.computeEffectiveAbility({
        user,
        token: appToken,
      });

      return {
        authenticated: true,
        credentials: { token: appToken, user },
        ability: effectiveAbility,
      };
    },
    verify(auth) {
      const { credentials } = auth;

      if (!credentials || !credentials.token) {
        throw new UnauthorizedError('Token not found');
      }

      const { token } = credentials;
      const currentDate = new Date();

      if (!isNil(token.expiresAt)) {
        const expirationDate = new Date(token.expiresAt);
        if (expirationDate < currentDate) {
          throw new UnauthorizedError('Token expired');
        }
      }

      // MCP gating is done at the capability level, not via route scope
    },
  };
};
