import jwt from 'jsonwebtoken';
import type { Core } from '@strapi/types';
import { MCP_SESSION_ORIGIN } from '../constants';

const SESSION_UID = 'admin::session';

/**
 * How long after a rotation the previous refresh token may still be presented and receive
 * the same child token back. Covers a client retrying after a lost response, or several
 * processes sharing one credential and refreshing at the same time; reuse outside the
 * window still revokes the whole grant family.
 */
export const REFRESH_REUSE_GRACE_MS = 30 * 1000;

export interface GrantMetadata {
  clientId: string;
  scope?: string;
  resource?: string;
}

interface SessionRow {
  userId: string;
  sessionId: string;
  childId: string | null;
  deviceId: string;
  origin: string;
  status: string;
  metadata: GrantMetadata | null;
  createdAt?: string | Date;
  expiresAt?: string | Date;
}

export interface IssueGrantInput {
  userId: string;
  grantId: string;
  clientId: string;
  scope?: string;
  resource?: string;
}

export type GrantTokens = {
  accessToken: string;
  refreshToken: string;
  scope?: string;
};

export type McpGrantSessionService = ReturnType<typeof createGrantSessionService>;

/**
 * MCP OAuth grants are session-manager sessions under the 'mcp' origin. The grant family id
 * is stored as the session deviceId (shared by every rotation of the refresh token), and
 * OAuth-specific facts (clientId, scope, resource) ride in the session metadata.
 */
export const createGrantSessionService = (strapi: Core.Strapi, jwtSecret: string) => {
  const sessions = () => strapi.sessionManager(MCP_SESSION_ORIGIN);

  /**
   * Verifies the token signature and returns its sessionId, regardless of session state.
   * The session manager's own validators reject rotated sessions outright, but replay
   * detection needs to resolve the session row of an already-rotated token.
   */
  const decodeTokenSessionId = (token: unknown, type: 'refresh' | 'access'): string | null => {
    if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
      return null;
    }

    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;

      if (payload.type !== type || typeof payload.sessionId !== 'string') {
        return null;
      }

      return payload.sessionId;
    } catch {
      return null;
    }
  };

  const findSessionRow = async (sessionId: string): Promise<SessionRow | null> => {
    // The origin session manager exposes no metadata read; core already queries the session
    // store directly by UID (see session-manager.ts createDatabaseProvider).
    const row = await strapi.db.query(SESSION_UID).findOne({ where: { sessionId } });

    if (row?.origin !== MCP_SESSION_ORIGIN) {
      return null;
    }

    return row as SessionRow;
  };

  const revokeFamily = async (userId: string, grantId: string): Promise<void> => {
    await sessions().invalidateRefreshToken(userId, grantId);
  };

  /**
   * The grant acts as the approving admin user; refreshing must stop the moment that user
   * is deleted, deactivated, or blocked — otherwise a grant could rotate forever and come
   * back to life when a user is reactivated.
   */
  const isGrantUserActive = async (rawUserId: string): Promise<boolean> => {
    const numericUserId = Number(rawUserId);
    const userId =
      Number.isFinite(numericUserId) && String(numericUserId) === rawUserId
        ? numericUserId
        : rawUserId;

    const user = await strapi.db.query('admin::user').findOne({ where: { id: userId } });

    return user?.isActive === true && user.blocked !== true;
  };

  /**
   * Within the reuse grace window, a rotated token resolves to its still-active child:
   * the same child refresh token is returned instead of revoking the family.
   */
  const replayChildWithinGrace = async (row: SessionRow): Promise<GrantTokens | null> => {
    if (row.childId === null) {
      return null;
    }

    const child: SessionRow | null = await strapi.db
      .query(SESSION_UID)
      .findOne({ where: { sessionId: row.childId } });

    if (
      child?.origin !== MCP_SESSION_ORIGIN ||
      child.status !== 'active' ||
      child.childId !== null ||
      !child.createdAt ||
      !child.expiresAt ||
      Date.now() - new Date(child.createdAt).getTime() > REFRESH_REUSE_GRACE_MS
    ) {
      return null;
    }

    // Reconstruct the child's refresh token the way the session manager signs it.
    const childToken = jwt.sign(
      {
        userId: child.userId,
        sessionId: child.sessionId,
        type: 'refresh',
        iat: Math.floor(new Date(child.createdAt).getTime() / 1000),
        exp: Math.floor(new Date(child.expiresAt).getTime() / 1000),
      },
      jwtSecret,
      { algorithm: 'HS256', noTimestamp: true }
    );

    const accessResult = await sessions().generateAccessToken(childToken);

    if ('error' in accessResult) {
      return null;
    }

    return {
      accessToken: accessResult.token,
      refreshToken: childToken,
      ...(row.metadata?.scope !== undefined ? { scope: row.metadata.scope } : {}),
    };
  };

  return {
    findSessionRow,
    revokeFamily,

    async issueGrant(input: IssueGrantInput): Promise<GrantTokens> {
      const metadata: GrantMetadata = {
        clientId: input.clientId,
        ...(input.scope !== undefined ? { scope: input.scope } : {}),
        ...(input.resource !== undefined ? { resource: input.resource } : {}),
      };

      const { token: refreshToken } = await sessions().generateRefreshToken(
        String(input.userId),
        input.grantId,
        { type: 'refresh', metadata: { ...metadata } }
      );

      const accessResult = await sessions().generateAccessToken(refreshToken);

      if ('error' in accessResult) {
        throw new Error(`[MCP] Failed to generate an access token: ${accessResult.error}`);
      }

      return {
        accessToken: accessResult.token,
        refreshToken,
        ...(input.scope !== undefined ? { scope: input.scope } : {}),
      };
    },

    /**
     * Rotates the refresh token and issues a new access token. Reuse of an already-rotated
     * refresh token, or presentation by the wrong client, revokes the whole grant family
     * (OAuth 2.1 §4.3.1).
     */
    async refreshGrant(
      refreshToken: string,
      clientId: string
    ): Promise<GrantTokens | { error: 'invalid_grant' }> {
      const sessionId = decodeTokenSessionId(refreshToken, 'refresh');

      if (sessionId === null) {
        return { error: 'invalid_grant' };
      }

      const row = await findSessionRow(sessionId);

      if (!row) {
        return { error: 'invalid_grant' };
      }

      if (row.metadata?.clientId !== clientId) {
        // The refresh token was presented by a different client than the one it was
        // issued to: treat it as leaked and revoke the whole grant.
        strapi.log.warn(
          `[MCP] Refresh token for grant ${row.deviceId} presented by the wrong client; the grant was revoked`
        );
        await revokeFamily(row.userId, row.deviceId);
        return { error: 'invalid_grant' };
      }

      if (!(await isGrantUserActive(row.userId))) {
        await revokeFamily(row.userId, row.deviceId);
        return { error: 'invalid_grant' };
      }

      if (row.status !== 'active' || row.childId !== null) {
        const replayed = await replayChildWithinGrace(row);

        if (replayed !== null) {
          return replayed;
        }

        // The token was rotated out beyond the grace window: a replay, revoke the family.
        strapi.log.warn(
          `[MCP] Rotated refresh token replayed for grant ${row.deviceId} (client ${clientId}); the grant was revoked`
        );
        await revokeFamily(row.userId, row.deviceId);
        return { error: 'invalid_grant' };
      }

      const rotation = await sessions().rotateRefreshToken(refreshToken);

      if ('error' in rotation) {
        return { error: 'invalid_grant' };
      }

      const accessResult = await sessions().generateAccessToken(rotation.token);

      if ('error' in accessResult) {
        return { error: 'invalid_grant' };
      }

      return {
        accessToken: accessResult.token,
        refreshToken: rotation.token,
        ...(row.metadata?.scope !== undefined ? { scope: row.metadata.scope } : {}),
      };
    },

    /**
     * RFC 7009 revocation. Accepts a refresh or access token and revokes the grant family
     * it belongs to. Returns false when the token does not resolve to a grant of the given
     * client (the endpoint still answers 200 in that case, per the RFC).
     */
    async revokeToken(token: string, clientId: string): Promise<boolean> {
      const sessionId =
        decodeTokenSessionId(token, 'refresh') ?? decodeTokenSessionId(token, 'access');

      if (sessionId === null) {
        return false;
      }

      const row = await findSessionRow(sessionId);

      if (!row || row.metadata?.clientId !== clientId) {
        return false;
      }

      strapi.log.info(`[MCP] OAuth grant ${row.deviceId} revoked by client ${clientId}`);
      await revokeFamily(row.userId, row.deviceId);

      return true;
    },
  };
};
