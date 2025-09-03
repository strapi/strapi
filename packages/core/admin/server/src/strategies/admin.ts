import type { Context } from 'koa';
import type { Modules } from '@strapi/types';
import { getService } from '../utils';

/**
 * Returns the session manager instance if available, else null.
 */
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

  // When sessions are enabled, validate access tokens via session manager and require type === 'access'.
  const sessionsEnabled = Boolean(strapi.config.get('admin.auth.sessions.enabled', false));

  let userId: string | number | null = null;
  if (sessionsEnabled) {
    const manager = getSessionManager();
    if (!manager) {
      return { authenticated: false };
    }

    const result = manager.validateAccessToken(token);
    if (!result.isValid) {
      return { authenticated: false };
    }

    // Enforce session still exists and is not expired via session manager.
    const isActive = await manager.isSessionActive(result.payload.sessionId);
    if (!isActive) {
      return { authenticated: false };
    }

    // Coerce user id to DB column type to avoid undefined SQL bindings
    const rawUserId = result.payload.userId;
    const numericUserId = Number(rawUserId);
    userId = Number.isFinite(numericUserId) ? numericUserId : (rawUserId as unknown as string);
  } else {
    // Legacy path: decode legacy admin token
    const { payload, isValid } = getService('token').decodeJwtToken(token);
    if (!isValid) {
      return { authenticated: false };
    }
    userId = payload.id as any;
  }

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
