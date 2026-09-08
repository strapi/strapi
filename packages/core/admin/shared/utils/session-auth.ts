import crypto from 'crypto';
import type { Context } from 'koa';
import type { Modules } from '@strapi/types';
import { buildSessionMetadata } from '@strapi/utils';

import { resolveAuthCookieName } from './auth-cookie-name';
import { resolveAuthCookiePath } from './auth-cookie-path';
import { resolveAuthCookieDomain } from './auth-cookie-domain';
import type { AdminUser } from '../contracts/shared';

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

export const getAccessCookiePath = (): string => {
  const configured: string | undefined = strapi.config.get('admin.auth.cookie.path');
  return resolveAuthCookiePath(configured, warnViaStrapiLog);
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

/**
 * Cycle 3: the "trust this device" cookie. A random 32-byte token whose sha256 is stored in
 * `admin::mfa-trusted-device`; presenting it on `/login` lets an enrolled user skip the second
 * factor until the row's effective expiry. It inherits every scope option of the refresh cookie
 * (httpOnly, path, domain, secure, sameSite) so any deployment where the refresh cookie already
 * works is covered, and it carries an absolute `expires` rather than the refresh cookie's
 * idle/absolute pair: trust never slides.
 */
export const MFA_TRUST_COOKIE_NAME = 'strapi_admin_mfa_trust';

export const buildTrustCookieOptions = (expiresAt: Date, secureRequest?: boolean) => {
  const base = getRefreshCookieOptions(secureRequest);
  return {
    ...base,
    expires: expiresAt,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  };
};

export const setTrustCookie = (ctx: Context, token: string, expiresAt: Date): void => {
  ctx.cookies.set(
    MFA_TRUST_COOKIE_NAME,
    token,
    buildTrustCookieOptions(expiresAt, ctx.request.secure)
  );
};

/** Same scope options as the set, so the browser matches and drops the right cookie. */
export const clearTrustCookie = (ctx: Context): void => {
  ctx.cookies.set(MFA_TRUST_COOKIE_NAME, '', {
    ...getRefreshCookieOptions(ctx.request.secure),
    expires: new Date(0),
  });
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
 * Mints an admin refresh session and access token, then writes them to `ctx`: the refresh
 * cookie and `ctx.body`. This is the single place every CE flow that authenticates a user
 * (password login, the MFA challenge, registration, first-admin registration, password reset)
 * turns that authentication into a session — so there is exactly one implementation of the
 * refresh-cookie/access-token dance to keep in sync.
 *
 * `options.deviceId` / `options.rememberMe` override what would otherwise be read from
 * `ctx.request.body` via `extractDeviceParams`. Reset-password uses this to force a fresh
 * device id and a non-persistent session cookie regardless of what the caller's body contains;
 * every other caller omits `options` and lets the request body decide.
 */
export const issueSession = async (
  ctx: Context,
  user: AdminUser,
  options: {
    deviceId?: string;
    rememberMe?: boolean;
    /** Set by the controllers when cycle 2 enforcement returned a grace outcome. */
    mfaEnrolment?: { graceUntil: Date };
  } = {}
): Promise<void> => {
  try {
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      ctx.internalServerError();
      return;
    }

    const userId = String(user.id);
    const bodyParams = extractDeviceParams(ctx.request.body);
    const deviceId = options.deviceId ?? bodyParams.deviceId;
    const rememberMe = options.rememberMe ?? bodyParams.rememberMe;

    const { token: refreshToken, absoluteExpiresAt } = await sessionManager(
      'admin'
    ).generateRefreshToken(userId, deviceId, {
      type: rememberMe ? 'refresh' : 'session',
      metadata: buildSessionMetadataFromContext(ctx),
    });

    const cookieOptions = buildCookieOptionsWithExpiry(
      rememberMe ? 'refresh' : 'session',
      absoluteExpiresAt,
      ctx.request.secure
    );
    ctx.cookies.set(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

    const accessResult = await sessionManager('admin').generateAccessToken(refreshToken);
    if ('error' in accessResult) {
      ctx.internalServerError();
      return;
    }

    const { token: accessToken } = accessResult;

    ctx.body = {
      data: {
        token: accessToken,
        accessToken,
        user: strapi.service('admin::user').sanitizeUser(user),
        ...(options.mfaEnrolment
          ? {
              mfaEnrolmentRequired: true as const,
              mfaGraceUntil: options.mfaEnrolment.graceUntil.toISOString(),
            }
          : {}),
      },
    };
  } catch (error) {
    strapi.log.error('Failed to create admin refresh session', error);
    ctx.internalServerError();
  }
};

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
