import crypto from 'crypto';
import type { Context } from 'koa';
import type { Modules } from '@strapi/types';
import { buildSessionMetadata } from '@strapi/utils';

import { resolveAuthCookieName } from './auth-cookie-name';
import { resolveAuthCookiePath } from './auth-cookie-path';
import { resolveAuthCookieDomain } from './auth-cookie-domain';

const ADMIN_ORIGIN = 'admin';
const SESSION_CONTENT_TYPE = 'admin::session';

export const REFRESH_COOKIE_NAME = 'strapi_admin_refresh';

export const getAccessCookieName = (): string => {
  const configured: string | undefined = strapi.config.get('admin.auth.cookie.name');
  return resolveAuthCookieName(configured);
};

export const getAccessCookiePath = (): string => {
  const configured: string | undefined = strapi.config.get('admin.auth.cookie.path');
  return resolveAuthCookiePath(configured);
};

export const getAccessCookieDomain = (): string | undefined => {
  const configured: string | undefined =
    strapi.config.get('admin.auth.cookie.domain') || strapi.config.get('admin.auth.domain');
  return resolveAuthCookieDomain(configured);
};

export const DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN = 30 * 24 * 60 * 60;
export const DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN = 14 * 24 * 60 * 60;
export const DEFAULT_MAX_SESSION_LIFESPAN = 1 * 24 * 60 * 60;
export const DEFAULT_IDLE_SESSION_LIFESPAN = 2 * 60 * 60;

export const getRefreshCookieOptions = (secureRequest?: boolean) => {
  const configuredSecure = strapi.config.get('admin.auth.cookie.secure');
  const isProduction = process.env.NODE_ENV === 'production';

  const domain: string | undefined =
    strapi.config.get('admin.auth.cookie.domain') || strapi.config.get('admin.auth.domain');
  const path = getAccessCookiePath();

  const sameSite: boolean | 'lax' | 'strict' | 'none' =
    strapi.config.get('admin.auth.cookie.sameSite') ?? 'lax';

  let isSecure: boolean;
  if (typeof configuredSecure === 'boolean') {
    isSecure = configuredSecure;
  } else if (secureRequest !== undefined) {
    isSecure = isProduction && secureRequest;
  } else {
    isSecure = isProduction;
  }

  return {
    httpOnly: true,
    secure: isSecure,
    overwrite: true,
    domain,
    path,
    sameSite,
    maxAge: undefined,
  };
};

const getLifespansForType = (
  type: 'refresh' | 'session'
): { idleSeconds: number; maxSeconds: number } => {
  if (type === 'refresh') {
    const idleSeconds = Number(
      strapi.config.get(
        'admin.auth.sessions.idleRefreshTokenLifespan',
        DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN
      )
    );
    const maxSeconds = Number(
      strapi.config.get(
        'admin.auth.sessions.maxRefreshTokenLifespan',
        DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN
      )
    );

    return { idleSeconds, maxSeconds };
  }

  const idleSeconds = Number(
    strapi.config.get('admin.auth.sessions.idleSessionLifespan', DEFAULT_IDLE_SESSION_LIFESPAN)
  );
  const maxSeconds = Number(
    strapi.config.get('admin.auth.sessions.maxSessionLifespan', DEFAULT_MAX_SESSION_LIFESPAN)
  );

  return { idleSeconds, maxSeconds };
};

export const buildCookieOptionsWithExpiry = (
  type: 'refresh' | 'session',
  absoluteExpiresAtISO?: string,
  secureRequest?: boolean
) => {
  const base = getRefreshCookieOptions(secureRequest);
  if (type === 'session') {
    return base;
  }

  const { idleSeconds } = getLifespansForType('refresh');
  const now = Date.now();
  const idleExpiry = now + idleSeconds * 1000;
  const absoluteExpiry = absoluteExpiresAtISO
    ? new Date(absoluteExpiresAtISO).getTime()
    : idleExpiry;
  const chosen = new Date(Math.min(idleExpiry, absoluteExpiry));

  return { ...base, expires: chosen, maxAge: Math.max(0, chosen.getTime() - now) };
};

export const getSessionManager = (): Modules.SessionManager.SessionManagerService | null => {
  const manager = strapi.sessionManager as Modules.SessionManager.SessionManagerService | undefined;
  return manager ?? null;
};

export const generateDeviceId = (): string => crypto.randomUUID();

export const extractDeviceParams = (
  requestBody: unknown
): { deviceId: string; rememberMe: boolean } => {
  const body = (requestBody ?? {}) as { deviceId?: string; rememberMe?: boolean };
  const deviceId = body.deviceId || generateDeviceId();
  const rememberMe = Boolean(body.rememberMe);

  return { deviceId, rememberMe };
};

export const buildSessionMetadataFromContext = (ctx: Context) =>
  buildSessionMetadata({
    userAgent: ctx.request.headers['user-agent'],
  });

/**
 * Resolves the device id to use when revoking sessions on logout.
 * SSO assigns deviceId server-side, so the client-provided value may not match
 * the active session row. Prefer the deviceId stored on the session backing
 * the current access token when available.
 *
 * Callers should pass `ctx.state.session.id` from the admin auth strategy and
 * the already-parsed body `deviceId` — the logout route requires authentication,
 * so sessionId is expected to be present.
 */
export const resolveLogoutDeviceId = async (
  userId: string,
  sessionId: string | undefined,
  clientDeviceId: string | undefined
): Promise<string | undefined> => {
  if (!sessionId) {
    strapi.log.debug('resolveLogoutDeviceId: no sessionId; falling back to client deviceId');
    return clientDeviceId;
  }

  const session = await strapi.db.query(SESSION_CONTENT_TYPE).findOne({
    where: { sessionId },
  });

  if (session?.userId !== userId || session?.origin !== ADMIN_ORIGIN) {
    strapi.log.debug(
      'resolveLogoutDeviceId: access-token session missing or not owned; falling back to client deviceId'
    );
    return clientDeviceId;
  }

  return typeof session.deviceId === 'string' ? session.deviceId : clientDeviceId;
};
