import type { Core } from '@strapi/types';
import type { McpAdminTokenAuthResult } from '../authentication';
import { MCP_SESSION_ORIGIN } from './constants';

/**
 * Authenticates an MCP OAuth access token (a session-manager JWT under the 'mcp' origin).
 *
 * Mirrors the admin session strategy: validate the JWT, require an active session of the
 * right origin, then load the admin user and compute their current ability so permission
 * changes, deactivation, and blocking apply on the next request.
 */
export const createMcpOAuthTokenAuthenticator = (strapi: Core.Strapi) => ({
  async authenticate(token: string): Promise<McpAdminTokenAuthResult> {
    const invalid = { authenticated: false, reason: 'invalid_token' } as const;

    const sessions = strapi.sessionManager(MCP_SESSION_ORIGIN);

    const result = sessions.validateAccessToken(token);

    if (!result.isValid) {
      return invalid;
    }

    // validateAccessToken only checks the signature; the origin and revocation checks
    // come from the session row.
    const isActive = await sessions.isSessionActive(result.payload.sessionId);

    if (!isActive) {
      return invalid;
    }

    const rawUserId = result.payload.userId;
    const numericUserId = Number(rawUserId);
    const userId =
      Number.isFinite(numericUserId) && String(numericUserId) === rawUserId
        ? numericUserId
        : rawUserId;

    const user = await strapi.db
      .query('admin::user')
      .findOne({ where: { id: userId }, populate: ['roles'] });

    if (user?.isActive !== true || user.blocked === true) {
      return invalid;
    }

    const ability = await strapi.admin.services.permission.engine.generateUserAbility(user);

    return {
      authenticated: true,
      credentials: { id: user.id },
      user: { id: user.id },
      ability,
    };
  },
});
