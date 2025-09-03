import type { Context, Next } from 'koa';
import crypto from 'crypto';
import type { Modules } from '@strapi/types';
import passport from 'koa-passport';
import compose from 'koa-compose';
import '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateRenewTokenInput,
  validateAccessTokenExchangeInput,
  // Validates optional session-related fields for login requests
  validateLoginOptionalSessionInput,
} from '../validation/authentication';

import type {
  ForgotPassword,
  Login,
  Register,
  RegistrationInfo,
  RenewToken,
  ResetPassword,
  AccessTokenExchange,
} from '../../../shared/contracts/authentication';
import { AdminUser } from '../../../shared/contracts/shared';

const { ApplicationError, ValidationError } = errors;

const isSessionsEnabled = (): boolean =>
  Boolean(strapi.config.get('admin.auth.sessions.enabled', false));

const refreshCookieName = 'strapi_admin_refresh';

const getRefreshCookieOptions = () => {
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
  };
};

/**
 * Returns refresh token TTL in seconds.
 */
const getRefreshTokenTTLSeconds = (): number =>
  Number(strapi.config.get('admin.auth.sessions.refreshTokenLifespan', 30 * 24 * 60 * 60));

const getSessionManager = (): Modules.SessionManager.SessionManagerService | null => {
  const manager = strapi.sessionManager as Modules.SessionManager.SessionManagerService | undefined;

  return manager ?? null;
};

const generateDeviceId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');

export default {
  login: compose([
    // Validate optional session-related fields (deviceId, rememberMe) without
    // constraining credential fields handled by passport
    async (ctx: Context, next: Next) => {
      await validateLoginOptionalSessionInput(ctx.request.body ?? {});
      return next();
    },
    (ctx: Context, next: Next) => {
      return passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
          strapi.eventHub.emit('admin.auth.error', { error: err, provider: 'local' });
          // if this is a recognized error, allow it to bubble up to user
          if (err.details?.code === 'LOGIN_NOT_ALLOWED') {
            throw err;
          }

          // for all other errors throw a generic error to prevent leaking info
          return ctx.notImplemented();
        }

        if (!user) {
          strapi.eventHub.emit('admin.auth.error', {
            error: new Error(info.message),
            provider: 'local',
          });
          throw new ApplicationError(info.message);
        }

        const query = ctx.state as Login.Request['query'];
        query.user = user;

        const sanitizedUser = getService('user').sanitizeUser(user);
        strapi.eventHub.emit('admin.auth.success', { user: sanitizedUser, provider: 'local' });

        return next();
      })(ctx, next);
    },
    async (ctx: Context) => {
      const { user } = ctx.state as { user: AdminUser };

      // Always generate the legacy token for backward compatibility and potential
      // consumers that still rely on it. When sessions are enabled, the access
      // token becomes the primary token exposed as data.token.
      const legacyToken = getService('token').createJwtToken(user);

      let issuedRefreshToken: string | null = null;
      let issuedAccessToken: string | null = null;
      if (isSessionsEnabled()) {
        try {
          const sessionManager = getSessionManager();

          if (sessionManager) {
            const requestBody = (ctx.request.body ?? {}) as {
              deviceId?: string;
              rememberMe?: boolean;
            };

            const userId = String(user.id);
            const deviceId = requestBody.deviceId || generateDeviceId();
            const rememberMe = Boolean(requestBody.rememberMe);

            const { token: refreshToken } = await sessionManager.generateRefreshToken(
              userId,
              deviceId,
              'admin'
            );
            issuedRefreshToken = refreshToken;

            const cookieOptions = getRefreshCookieOptions();

            const optsWithExpiry = rememberMe
              ? {
                  ...cookieOptions,
                  expires: new Date(Date.now() + getRefreshTokenTTLSeconds() * 1000),
                }
              : cookieOptions;

            ctx.cookies.set(refreshCookieName, refreshToken, optsWithExpiry);

            const accessResult = await sessionManager.generateAccessToken(refreshToken);
            if ('token' in accessResult) {
              issuedAccessToken = accessResult.token;
            }
          } else {
            strapi.log.warn('Session manager is not available; skipping refresh cookie issuance');
          }
        } catch (error) {
          strapi.log.error('Failed to create admin refresh session', error);
        }
      }

      const primaryToken = issuedAccessToken ?? legacyToken;

      ctx.body = {
        data: {
          // When sessions are enabled, expose the short‑lived access token here.
          // Otherwise, fall back to the legacy token.
          token: primaryToken,
          accessToken: issuedAccessToken ?? undefined,
          refreshToken: issuedRefreshToken ?? undefined,
          legacyToken: isSessionsEnabled() ? legacyToken : undefined,
          user: getService('user').sanitizeUser(ctx.state.user),
        },
      } satisfies Login.Response;
    },
  ]),

  async renewToken(ctx: Context) {
    // Mark legacy renew as deprecated and provide guidance for the new endpoint
    ctx.set('Deprecation', 'true');
    ctx.set('Link', '</admin/access-token>; rel="alternate"');
    ctx.set('Warning', '299 - "Deprecated admin endpoint: use /admin/access-token"');
    strapi.log.warn('DEPRECATED /admin/renew-token used. Prefer /admin/access-token.');

    // When sessions are enabled, treat renew as an alias of access-token to
    // preserve compatibility with existing admin clients.
    if (isSessionsEnabled()) {
      try {
        const sessionManager = getSessionManager();
        if (!sessionManager) {
          return ctx.internalServerError();
        }

        const cookieToken = ctx.cookies.get(refreshCookieName);
        if (!cookieToken) {
          return ctx.unauthorized('Missing refresh token');
        }

        const result = await sessionManager.generateAccessToken(cookieToken);
        if ('error' in result) {
          return ctx.unauthorized('Invalid refresh token');
        }

        const { token } = result;
        ctx.body = { data: { token } } satisfies RenewToken.Response;
        return;
      } catch (err) {
        strapi.log.error('Failed to renew via refresh cookie', err as any);
        return ctx.internalServerError();
      }
    }

    // Legacy path: renew legacy JWT
    await validateRenewTokenInput(ctx.request.body);

    const { token } = ctx.request.body as RenewToken.Request['body'];

    const { isValid, payload } = getService('token').decodeJwtToken(token);

    if (!isValid) {
      throw new ValidationError('Invalid token');
    }

    ctx.body = {
      data: {
        token: getService('token').createJwtToken({ id: payload.id }),
      },
    } satisfies RenewToken.Response;
  },

  async registrationInfo(ctx: Context) {
    await validateRegistrationInfoQuery(ctx.request.query);

    const { registrationToken } = ctx.request.query as RegistrationInfo.Request['query'];

    const registrationInfo = await getService('user').findRegistrationInfo(registrationToken);

    if (!registrationInfo) {
      throw new ValidationError('Invalid registrationToken');
    }

    ctx.body = { data: registrationInfo } satisfies RegistrationInfo.Response;
  },

  async register(ctx: Context) {
    const input = ctx.request.body as Register.Request['body'];

    await validateRegistrationInput(input);

    const user = await getService('user').register(input);

    // Always create legacy token; when sessions are enabled the access token will
    // be exposed as data.token, and legacyToken attached separately for
    // compatibility.
    const legacyToken = getService('token').createJwtToken(user);

    let issuedRefreshToken: string | null = null;
    let issuedAccessToken: string | null = null;
    if (isSessionsEnabled()) {
      try {
        const sessionManager = getSessionManager();
        if (sessionManager) {
          const requestBody = (ctx.request.body ?? {}) as {
            deviceId?: string;
            rememberMe?: boolean;
          };

          const userId = String(user.id);
          const deviceId = requestBody.deviceId || generateDeviceId();
          const rememberMe = Boolean(requestBody.rememberMe);

          const { token: refreshToken } = await sessionManager.generateRefreshToken(
            userId,
            deviceId,
            'admin'
          );
          issuedRefreshToken = refreshToken;

          const cookieOptions = getRefreshCookieOptions();
          const optsWithExpiry = rememberMe
            ? {
                ...cookieOptions,
                expires: new Date(Date.now() + getRefreshTokenTTLSeconds() * 1000),
              }
            : cookieOptions;

          ctx.cookies.set(refreshCookieName, refreshToken, optsWithExpiry);

          const accessResult = await sessionManager.generateAccessToken(refreshToken);
          if ('token' in accessResult) {
            issuedAccessToken = accessResult.token;
          }
        }
      } catch (error) {
        strapi.log.error('Failed to create admin refresh session during register', error);
      }
    }

    const primaryToken = issuedAccessToken ?? legacyToken;

    ctx.body = {
      data: {
        token: primaryToken,
        accessToken: issuedAccessToken ?? undefined,
        refreshToken: issuedRefreshToken ?? undefined,
        legacyToken: isSessionsEnabled() ? legacyToken : undefined,
        user: getService('user').sanitizeUser(user),
      },
    } satisfies Register.Response;
  },

  async registerAdmin(ctx: Context) {
    const input = ctx.request.body as Register.Request['body'];

    await validateAdminRegistrationInput(input);

    const hasAdmin = await getService('user').exists();

    if (hasAdmin) {
      throw new ApplicationError('You cannot register a new super admin');
    }

    const superAdminRole = await getService('role').getSuperAdmin();

    if (!superAdminRole) {
      throw new ApplicationError(
        "Cannot register the first admin because the super admin role doesn't exist."
      );
    }

    const user = await getService('user').create({
      ...input,
      registrationToken: null,
      isActive: true,
      roles: superAdminRole ? [superAdminRole.id] : [],
    });

    strapi.telemetry.send('didCreateFirstAdmin');

    // Always create legacy token; when sessions are enabled the access token will
    // be exposed as data.token, and legacyToken attached separately for
    // compatibility.
    const legacyToken = getService('token').createJwtToken(user);

    let issuedRefreshToken: string | null = null;
    let issuedAccessToken: string | null = null;
    if (isSessionsEnabled()) {
      try {
        const sessionManager = getSessionManager();
        if (sessionManager) {
          const requestBody = (ctx.request.body ?? {}) as {
            deviceId?: string;
            rememberMe?: boolean;
          };

          const userId = String(user.id);
          const deviceId = requestBody.deviceId || generateDeviceId();
          const rememberMe = Boolean(requestBody.rememberMe);

          const { token: refreshToken } = await sessionManager.generateRefreshToken(
            userId,
            deviceId,
            'admin'
          );
          issuedRefreshToken = refreshToken;

          const cookieOptions = getRefreshCookieOptions();
          const optsWithExpiry = rememberMe
            ? {
                ...cookieOptions,
                expires: new Date(Date.now() + getRefreshTokenTTLSeconds() * 1000),
              }
            : cookieOptions;

          ctx.cookies.set(refreshCookieName, refreshToken, optsWithExpiry);

          const accessResult = await sessionManager.generateAccessToken(refreshToken);
          if ('token' in accessResult) {
            issuedAccessToken = accessResult.token;
          }
        }
      } catch (error) {
        strapi.log.error('Failed to create admin refresh session during register-admin', error);
      }
    }

    const primaryToken = issuedAccessToken ?? legacyToken;

    ctx.body = {
      data: {
        token: primaryToken,
        accessToken: issuedAccessToken ?? undefined,
        refreshToken: issuedRefreshToken ?? undefined,
        legacyToken: isSessionsEnabled() ? legacyToken : undefined,
        user: getService('user').sanitizeUser(user),
      },
    };
  },

  async forgotPassword(ctx: Context) {
    const input = ctx.request.body as ForgotPassword.Request['body'];

    await validateForgotPasswordInput(input);

    getService('auth').forgotPassword(input);

    ctx.status = 204;
  },

  async resetPassword(ctx: Context) {
    const input = ctx.request.body as ResetPassword.Request['body'];

    await validateResetPasswordInput(input);

    const user = await getService('auth').resetPassword(input);

    ctx.body = {
      data: {
        token: getService('token').createJwtToken(user),
        user: getService('user').sanitizeUser(user),
      },
    } satisfies ResetPassword.Response;
  },

  async accessToken(ctx: Context) {
    if (!isSessionsEnabled()) {
      // Endpoint not available when sessions are disabled
      return ctx.notFound();
    }

    // Validate optional body to support non-cookie clients
    await validateAccessTokenExchangeInput(ctx.request.body ?? {});

    // Optionally accept refreshToken in request body for non-cookie clients
    const body = (ctx.request.body ?? {}) as AccessTokenExchange.Request['body'];
    const cookieToken = ctx.cookies.get(refreshCookieName);
    const refreshToken = body?.refreshToken || cookieToken;

    if (!refreshToken) {
      return ctx.unauthorized('Missing refresh token');
    }

    try {
      const sessionManager = getSessionManager();
      if (!sessionManager) {
        return ctx.internalServerError();
      }

      const result = await sessionManager.generateAccessToken(refreshToken);
      if ('error' in result) {
        return ctx.unauthorized('Invalid refresh token');
      }

      const { token } = result;
      ctx.body = { data: { token } };
    } catch (err) {
      strapi.log.error('Failed to generate access token from refresh token', err as any);
      return ctx.internalServerError();
    }
  },

  async logout(ctx: Context) {
    const sanitizedUser = getService('user').sanitizeUser(ctx.state.user);
    strapi.eventHub.emit('admin.logout', { user: sanitizedUser });

    if (isSessionsEnabled()) {
      const bodyDeviceId = ctx.request.body?.deviceId as string | undefined;
      const deviceId = typeof bodyDeviceId === 'string' ? bodyDeviceId : undefined;

      // Clear cookie regardless of token validity
      ctx.cookies.set(refreshCookieName, '', {
        ...getRefreshCookieOptions(),
        expires: new Date(0),
      });

      // Best effort revocation for this user (optionally scoped to deviceId)
      try {
        const sessionManager = getSessionManager();
        if (sessionManager) {
          const userId = String(ctx.state.user.id);
          await sessionManager.invalidateRefreshToken('admin', userId, deviceId);
        }
      } catch (err) {
        strapi.log.error('Failed to revoke admin sessions during logout', err as any);
      }
    }

    ctx.body = { data: {} };
  },
};
