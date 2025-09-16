import crypto from 'crypto';
import type { Modules } from '@strapi/types';

export const REFRESH_COOKIE_NAME = 'strapi_admin_refresh';

const DEFAULT_ACCESS_TOKEN_LIFESPAN = 10 * 60;
const DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN = 30 * 24 * 60 * 60;
const DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN = 14 * 24 * 60 * 60;
const DEFAULT_MAX_SESSION_LIFESPAN = 1 * 24 * 60 * 60;
const DEFAULT_IDLE_SESSION_LIFESPAN = 2 * 60 * 60;

export const getRefreshCookieOptions = () => {
  const isProduction = strapi.config.get('environment') === 'production';
  const domain: string | undefined =
    strapi.config.get('admin.auth.cookie.domain') || strapi.config.get('admin.auth.domain');
  const path: string = strapi.config.get('admin.auth.cookie.path', '/admin');

  const sameSite: boolean | 'lax' | 'strict' | 'none' =
    strapi.config.get('admin.auth.cookie.sameSite') ?? 'lax';

  return {
    httpOnly: true,
    secure: isProduction,
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
  absoluteExpiresAtISO?: string
) => {
  const base = getRefreshCookieOptions();
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
