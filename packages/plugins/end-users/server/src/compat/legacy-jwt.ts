import jwt from 'jsonwebtoken';
import type { Core } from '@strapi/types';

import { USER_UID } from '../constants';
import type { CompatConfig } from './config';
import { LEGACY_ORIGIN } from './origin';

/**
 * A Bearer value that is not a session but is one of the tokens Users & Permissions issued:
 * a `{ id }` token signed with the legacy secret, or, from its refresh mode, an access token
 * that belongs to a session of the `users-permissions` origin.
 */
export type LegacyHit =
  { kind: 'legacy'; userId: string } | { kind: 'access'; userId: string; sessionId: string };

/** The numeric id Users & Permissions gave a user, as a claim: a number or a string of digits */
const toNumericId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }

  return typeof value === 'string' && /^[1-9]\d{0,15}$/.test(value) ? value : null;
};

const verifyAccessToken = async (strapi: Core.Strapi, token: string): Promise<LegacyHit | null> => {
  if (!strapi.sessionManager.hasOrigin(LEGACY_ORIGIN)) {
    return null;
  }

  const result = strapi.sessionManager(LEGACY_ORIGIN).validateAccessToken(token);

  if (!result.isValid || result.payload.type !== 'access') {
    return null;
  }

  const userId = toNumericId(result.payload.userId);
  const { sessionId } = result.payload;

  if (!userId || typeof sessionId !== 'string') {
    return null;
  }

  // A signed token is not enough: the session it came from must not have been revoked or expired
  if (!(await strapi.sessionManager(LEGACY_ORIGIN).isSessionActive(sessionId))) {
    return null;
  }

  return { kind: 'access', userId, sessionId };
};

const verifyIdToken = (token: string, cfg: CompatConfig, now: Date): LegacyHit | null => {
  const { secret, algorithm } = cfg.legacyJwt;

  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: [algorithm],
      clockTimestamp: Math.floor(now.getTime() / 1000),
    });
    const userId = typeof payload === 'string' ? null : toNumericId(payload.id);

    return userId ? { kind: 'legacy', userId } : null;
  } catch {
    // Wrong signature or algorithm, expired, malformed: all the same answer
    return null;
  }
};

/**
 * Checks a Bearer value against the tokens Users & Permissions issued. Only until
 * `legacyJwt.until`; after it, or with none set, nothing matches. `null` means it is not one.
 */
export const verifyLegacyBearer = async (
  strapi: Core.Strapi,
  token: string,
  cfg: CompatConfig,
  now: Date = new Date()
): Promise<LegacyHit | null> => {
  const { until } = cfg.legacyJwt;

  if (!until || until.getTime() <= now.getTime()) {
    return null;
  }

  return (await verifyAccessToken(strapi, token)) ?? verifyIdToken(token, cfg, now);
};

/**
 * The `documentId` of the user a legacy token names by its numeric id, or `null` when there is no
 * such user. The only place a numeric id is turned into the id the rest of the plugin uses.
 */
export const resolveLegacyUserId = async (
  strapi: Core.Strapi,
  hit: LegacyHit
): Promise<string | null> => {
  const user = (await strapi.db
    .query(USER_UID)
    .findOne({ where: { id: Number(hit.userId) }, select: ['documentId'] })) as {
    documentId?: string;
  } | null;

  return user?.documentId ?? null;
};
