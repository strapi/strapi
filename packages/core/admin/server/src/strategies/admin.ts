import type { Context } from 'koa';
import type { Modules } from '@strapi/types';
import { getService } from '../utils';
import type { AdminUser } from '../../../shared/contracts/shared';
import type * as permissionService from '../services/permission';

const ABILITY_CACHE_TTL_MS = 60_000;
const MAX_CACHED_SESSIONS = 500;

type AdminAbility = Awaited<ReturnType<typeof permissionService.engine.generateUserAbility>>;

type CachedAdminAuth = {
  ability: AdminAbility;
  expiresAt: number;
  user: AdminUser;
};

const abilityCache = new Map<string, CachedAdminAuth>();

const getCachedAdminAuth = (sessionId: string) => {
  const cached = abilityCache.get(sessionId);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    abilityCache.delete(sessionId);
    return null;
  }

  return cached;
};

const setCachedAdminAuth = (sessionId: string, value: Omit<CachedAdminAuth, 'expiresAt'>) => {
  if (abilityCache.size >= MAX_CACHED_SESSIONS) {
    const firstKey = abilityCache.keys().next().value;

    if (firstKey) {
      abilityCache.delete(firstKey);
    }
  }

  abilityCache.set(sessionId, {
    ...value,
    expiresAt: Date.now() + ABILITY_CACHE_TTL_MS,
  });
};

export const clearAdminAuthAbilityCache = () => {
  abilityCache.clear();
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
    abilityCache.delete(result.payload.sessionId);
    return { authenticated: false };
  }

  const cachedAuth = getCachedAdminAuth(result.payload.sessionId);

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

  const userAbility = await getService('permission').engine.generateUserAbility(user);

  // TODO: use the ability from ctx.state.auth instead of
  // ctx.state.userAbility, and remove the assign below
  ctx.state.userAbility = userAbility;
  ctx.state.user = user;

  setCachedAdminAuth(result.payload.sessionId, {
    ability: userAbility,
    user,
  });

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
