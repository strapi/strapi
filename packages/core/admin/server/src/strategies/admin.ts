import type { Context } from 'koa';
import type { Modules } from '@strapi/types';
import { INTERNAL_CACHE_NS } from '@strapi/utils';
import { getService } from '../utils';
import type { AdminUser } from '../../../shared/contracts/shared';

// Cache admin auth briefly to avoid reloading user permissions from the DB on every
// request for the same session. Use the database cache provider so all replicas share
// the same entries; ability is rebuilt from cached permissions + user via the engine
// (cheap CPU vs repeated permission queries).
const ABILITY_CACHE_TTL_MS = 60_000;

const ADMIN_AUTH_NS = INTERNAL_CACHE_NS.ADMIN_AUTH_ABILITY;

type CachedAuthPayload = {
  permissions: unknown;
  user: AdminUser;
};

const serializeForCache = (value: unknown) => JSON.parse(JSON.stringify(value));

/**
 * Drop all admin auth cache rows (all sessions). Used when roles/permissions/users change.
 */
export const clearAdminAuthAbilityCache = async () => {
  await strapi.db.query('strapi::cache-entry').deleteMany({
    where: { namespace: ADMIN_AUTH_NS },
  });
};

const getCachedAdminAuth = async (
  sessionId: string
): Promise<{ ability: unknown; user: AdminUser } | null> => {
  const entry = await strapi.cacheManager.get(ADMIN_AUTH_NS, sessionId, { provider: 'database' });

  if (!entry?.value) {
    return null;
  }

  const { permissions, user } = entry.value as CachedAuthPayload;
  const userAbility = await getService('permission').engine.generateAbility(
    permissions as any,
    user
  );

  return {
    ability: userAbility,
    user,
  };
};

const setCachedAdminAuth = async (sessionId: string, permissions: unknown, user: AdminUser) => {
  await strapi.cacheManager.set(
    ADMIN_AUTH_NS,
    sessionId,
    serializeForCache({ permissions, user }) as CachedAuthPayload,
    {
      provider: 'database',
      expiresAt: new Date(Date.now() + ABILITY_CACHE_TTL_MS),
    }
  );
};

const getSessionManager = (): Modules.SessionManager.SessionManagerService | null => {
  const manager = strapi.sessionManager as Modules.SessionManager.SessionManagerService | undefined;

  return manager ?? null;
};

/** @type {import('.').AuthenticateFunction} */
export const authenticate = async (ctx: Context) => {
  const { authorization } = ctx.request.header;

  if (!authorization) {
    return { authenticated: false };
  }

  const parts = authorization.split(/\s+/);

  if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
    return { authenticated: false };
  }

  const token = parts[1];

  // Validate access tokens via session manager and require an active session
  const manager = getSessionManager();
  if (!manager) {
    return { authenticated: false };
  }

  const result = manager('admin').validateAccessToken(token);
  if (!result.isValid) {
    return { authenticated: false };
  }

  const isActive = await manager('admin').isSessionActive(result.payload.sessionId);
  if (!isActive) {
    await strapi.cacheManager.delete(ADMIN_AUTH_NS, result.payload.sessionId, {
      provider: 'database',
    });
    return { authenticated: false };
  }

  const cachedAuth = await getCachedAdminAuth(result.payload.sessionId);

  if (cachedAuth) {
    ctx.state.userAbility = cachedAuth.ability;
    ctx.state.user = cachedAuth.user;

    return {
      authenticated: true,
      credentials: cachedAuth.user,
      ability: cachedAuth.ability,
    };
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

  if (!user || !(user.isActive === true)) {
    return { authenticated: false };
  }

  const permissions = await getService('permission').findUserPermissions(user as AdminUser);
  const userAbility = await getService('permission').engine.generateAbility(
    permissions as any,
    user
  );

  ctx.state.userAbility = userAbility;
  ctx.state.user = user;

  await setCachedAdminAuth(result.payload.sessionId, permissions, user as AdminUser);

  return {
    authenticated: true,
    credentials: user,
    ability: userAbility,
  };
};

export const name = 'admin';

/** @type {import('.').AuthStrategy} */
export default {
  name,
  authenticate,
};
