import jwt from 'jsonwebtoken';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../constants';
import type { CompatConfig } from './config';
import { LEGACY_ORIGIN } from './origin';

/**
 * A Bearer value that is not a session but is one of the tokens Users & Permissions issued:
 * a `{ id }` token signed with the legacy secret, or, from its refresh mode, an access token
 * that belongs to a session of the `users-permissions` origin.
 */
export type LegacyHit =
  { kind: 'legacy'; userId: string } | { kind: 'access'; userId: string; sessionId: string };

/** The largest id the user table's integer key holds */
const MAX_ID = 2_147_483_647;

/** The numeric id Users & Permissions gave a user, as a claim: a number or a string of digits */
const toNumericId = (value: unknown): string | null => {
  const id = typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : value;

  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id <= MAX_ID
    ? String(id)
    : null;
};

/** The plugin store key the migration from Users & Permissions records its outcome under */
export const MIGRATION_KEY = 'migration';

/** How long a read of the migration record is kept; it changes once, when the migration ends */
export const CUTOVER_TTL_MS = 60_000;

/**
 * The record a completed migration from Users & Permissions leaves in the plugin store, under
 * `MIGRATION_KEY` (`strapi.store({ type: 'plugin', name: 'end-users' })`):
 *
 * ```
 * { status: 'completed', cutoverAt: '<ISO 8601 time>' }
 * ```
 *
 * `cutoverAt` is the moment users stopped being served by Users & Permissions. The rows were moved
 * in place with their ids, so a legacy token's numeric id still names the same person. Any other
 * status, a missing record or an unreadable `cutoverAt` means no migration happened, and legacy
 * tokens are refused. The migration writes the record in place (other fields may sit next to
 * these two) and calls `service('compat').clearCutoverCache()` so this process sees it at once.
 */
interface CachedCutover {
  cutover: Date | null;
  expiresAt: number;
}

const cutoverCache = new WeakMap<Core.Strapi, CachedCutover>();

/** Forgets the cached read, so the next one goes to the store */
export const clearLegacyCutoverCache = (strapi: Core.Strapi): void => {
  cutoverCache.delete(strapi);
};

const parseCutover = (value: unknown): Date | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const { status, cutoverAt } = value as { status?: unknown; cutoverAt?: unknown };

  if (status !== 'completed' || typeof cutoverAt !== 'string') {
    return null;
  }

  const date = new Date(cutoverAt);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * When the migration from Users & Permissions was cut over, or `null` when no completed migration
 * is recorded (or the record cannot be read). The single reader of the record; cached for a minute
 * like the plugin's other settings, so a request does not read the store.
 */
export const readLegacyCutover = async (strapi: Core.Strapi): Promise<Date | null> => {
  const cached = cutoverCache.get(strapi);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.cutover;
  }

  try {
    const value = await strapi
      .store({ type: 'plugin', name: PLUGIN_ID })
      .get({ key: MIGRATION_KEY });
    const cutover = parseCutover(value);

    cutoverCache.set(strapi, { cutover, expiresAt: Date.now() + CUTOVER_TTL_MS });

    return cutover;
  } catch {
    // Fails closed, and is not kept: the next request tries again
    return null;
  }
};

/** `iat` and the cut-over are both in seconds; a token with no `iat` is refused */
const issuedBefore = (iat: unknown, cutoverSec: number): boolean =>
  typeof iat === 'number' && iat <= cutoverSec;

const verifyAccessToken = async (
  strapi: Core.Strapi,
  token: string,
  cutoverSec: number
): Promise<LegacyHit | null> => {
  if (!strapi.sessionManager.hasOrigin(LEGACY_ORIGIN)) {
    return null;
  }

  const result = strapi.sessionManager(LEGACY_ORIGIN).validateAccessToken(token);

  if (!result.isValid || result.payload.type !== 'access') {
    return null;
  }

  // Only a token issued before the cut-over is one of Users & Permissions'
  if (!issuedBefore(result.payload.iat, cutoverSec)) {
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

const verifyIdToken = (
  token: string,
  cfg: CompatConfig,
  now: Date,
  cutoverSec: number
): LegacyHit | null => {
  const { secret, algorithm } = cfg.legacyJwt;

  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: [algorithm],
      clockTimestamp: Math.floor(now.getTime() / 1000),
    });

    if (typeof payload === 'string' || !issuedBefore(payload.iat, cutoverSec)) {
      return null;
    }

    const userId = toNumericId(payload.id);

    return userId ? { kind: 'legacy', userId } : null;
  } catch {
    // Wrong signature or algorithm, expired, malformed: all the same answer
    return null;
  }
};

/**
 * Checks a Bearer value against the tokens Users & Permissions issued. Only until
 * `legacyJwt.until`, and only when a completed migration is recorded and the token was issued no
 * later than its cut-over; otherwise nothing matches. `null` means it is not one.
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

  const cutover = await readLegacyCutover(strapi);

  if (!cutover) {
    return null;
  }

  const cutoverSec = Math.floor(cutover.getTime() / 1000);

  return (
    (await verifyAccessToken(strapi, token, cutoverSec)) ??
    verifyIdToken(token, cfg, now, cutoverSec)
  );
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
