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

// The resolvers are browser-shared (also inlined into the admin bundle) so
// they default to console.warn; on the server, route their warnings through
// the Strapi logger instead.
const warnViaStrapiLog = (message: string): void => {
  strapi.log.warn(message);
};

export const getAccessCookieName = (): string => {
  const configured: string | undefined = strapi.config.get('admin.auth.cookie.name');
  return resolveAuthCookieName(configured, warnViaStrapiLog);
};

// The admin API routes are mounted under `/admin` whatever `admin.url` is.
const ADMIN_API_PREFIX = '/admin';

const getConfiguredCookiePath = (): string | undefined => {
  const configured: unknown = strapi.config.get('admin.auth.cookie.path');
  return typeof configured === 'string' && configured.trim() !== '' ? configured : undefined;
};

/**
 * Path the browser sees for one of the resolved absolute URLs, so it includes
 * a `server.url` subpath (`admin.path` does not). No trailing slash, except
 * for the root.
 */
const getBrowserPath = (key: 'admin.absoluteUrl' | 'server.absoluteUrl'): string | undefined => {
  const absoluteUrl: unknown = strapi.config.get(key);
  if (typeof absoluteUrl !== 'string' || absoluteUrl === '') {
    return undefined;
  }

  try {
    return new URL(absoluteUrl).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return undefined;
  }
};

/**
 * Path the browser uses for the admin API (`/admin/access-token`,
 * `/admin/login`, `/admin/logout`): `/admin` behind any `server.url` subpath.
 */
const getAdminApiPath = (): string => {
  const serverPath = getBrowserPath('server.absoluteUrl');
  const apiPath =
    serverPath && serverPath !== '/' ? `${serverPath}${ADMIN_API_PREFIX}` : ADMIN_API_PREFIX;
  return resolveAuthCookiePath(apiPath, warnViaStrapiLog);
};

// RFC 6265 section 5.1.4: whether the browser attaches a cookie scoped to
// `cookiePath` to a request for `requestPath`.
const cookiePathMatches = (cookiePath: string, requestPath: string): boolean => {
  if (requestPath === cookiePath) {
    return true;
  }

  return (
    requestPath.startsWith(cookiePath) &&
    (cookiePath.endsWith('/') || requestPath.charAt(cookiePath.length) === '/')
  );
};

/**
 * Path of the non-httpOnly access cookie. Only the admin panel reads it,
 * through `document.cookie`, which exposes a cookie only on pages its path
 * matches. So when `admin.auth.cookie.path` is unset it follows the path the
 * browser loads the panel from (`admin.url`, behind any `server.url` subpath).
 * The admin build resolves the same value (create-build-context.ts).
 */
export const getAccessCookiePath = (): string => {
  return resolveAuthCookiePath(
    getConfiguredCookiePath() ?? getBrowserPath('admin.absoluteUrl'),
    warnViaStrapiLog
  );
};

const warnedRefreshCookiePaths = new Set<string>();

/**
 * Path of the httpOnly refresh cookie (and every other cookie built from
 * `getRefreshCookieOptions`). Only the admin API reads it, and the API does not
 * move with `admin.url`, so it follows the API path instead of the panel.
 * `admin.auth.cookie.path` is kept when it covers the API path. Otherwise the
 * browser would never send the cookie to `/admin/access-token` and every
 * session would end when its access token expires, so the API path is used.
 */
export const getRefreshCookiePath = (): string => {
  const apiPath = getAdminApiPath();
  const configured = getConfiguredCookiePath();

  if (!configured) {
    return apiPath;
  }

  const configuredPath = resolveAuthCookiePath(configured, warnViaStrapiLog);
  if (cookiePathMatches(configuredPath, apiPath)) {
    return configuredPath;
  }

  if (!warnedRefreshCookiePaths.has(configuredPath)) {
    warnedRefreshCookiePaths.add(configuredPath);
    strapi.log.warn(
      `admin.auth.cookie.path "${configuredPath}" does not cover the admin API at "${apiPath}", so the browser would not send the refresh cookie to "${apiPath}/access-token". Using "${apiPath}" for the refresh cookie. The access cookie keeps "${configuredPath}".`
    );
  }

  return apiPath;
};

export const getAccessCookieDomain = (): string | undefined => {
  const configured: string | undefined =
    strapi.config.get('admin.auth.cookie.domain') || strapi.config.get('admin.auth.domain');
  return resolveAuthCookieDomain(configured, warnViaStrapiLog);
};

export const DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN = 30 * 24 * 60 * 60;
export const DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN = 14 * 24 * 60 * 60;
export const DEFAULT_MAX_SESSION_LIFESPAN = 1 * 24 * 60 * 60;
export const DEFAULT_IDLE_SESSION_LIFESPAN = 2 * 60 * 60;

export const getRefreshCookieOptions = (secureRequest?: boolean) => {
  const configuredSecure = strapi.config.get('admin.auth.cookie.secure');
  const isProduction = process.env.NODE_ENV === 'production';

  const domain = getAccessCookieDomain();
  const path = getRefreshCookiePath();

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
