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
  validateAccessTokenExchangeInput,
  validateLoginSessionInput,
} from '../validation/authentication';

import type {
  ForgotPassword,
  Login,
  Register,
  RegistrationInfo,
  ResetPassword,
} from '../../../shared/contracts/authentication';
import { AdminUser } from '../../../shared/contracts/shared';

const { ApplicationError, ValidationError } = errors;

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

const getRefreshTokenTTLSeconds = (): number =>
  Number(strapi.config.get('admin.auth.sessions.refreshTokenLifespan', 30 * 24 * 60 * 60));

const getSessionManager = (): Modules.SessionManager.SessionManagerService | null => {
  const manager = strapi.sessionManager as Modules.SessionManager.SessionManagerService | undefined;

  return manager ?? null;
};

// TODO do we need a fallback device ID if the client hasn't provided one?
const generateDeviceId = (): string => crypto.randomUUID();

/**
 * Extracts device parameters from a request body, returning a normalized
 * deviceId and rememberMe flag. Generates a deviceId if not provided.
 */
const extractDeviceParams = (requestBody: unknown): { deviceId: string; rememberMe: boolean } => {
  const body = (requestBody ?? {}) as { deviceId?: string; rememberMe?: boolean };
  const deviceId = body.deviceId || generateDeviceId();
  const rememberMe = Boolean(body.rememberMe);

  return { deviceId, rememberMe };
};

/**
 * Reads a refresh token from either the request cookie or body.
 * Primary flow: HTTP-only cookie (secure)
 * Fallback: Request body (for non-cookie clients)
 */
const readRefreshTokenFromRequest = (ctx: Context): string | null => {
  const cookieToken = ctx.cookies.get(refreshCookieName);
  const body = (ctx.request.body ?? {}) as { refreshToken?: string };

  return body?.refreshToken || cookieToken || null;
};

export default {
  login: compose([
    // Validate session-related fields (deviceId, rememberMe) without
    // constraining credential fields handled by passport
    async (ctx: Context, next: Next) => {
      await validateLoginSessionInput(ctx.request.body ?? {});
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

      try {
        const sessionManager = getSessionManager();
        if (!sessionManager) {
          return ctx.internalServerError();
        }
        const userId = String(user.id);
        const { deviceId, rememberMe } = extractDeviceParams(ctx.request.body);

        const { token: refreshToken } = await sessionManager.generateRefreshToken(
          userId,
          deviceId,
          'admin'
        );

        const cookieOptions = getRefreshCookieOptions();
        const optsWithExpiry = rememberMe
          ? {
              ...cookieOptions,
              expires: new Date(Date.now() + getRefreshTokenTTLSeconds() * 1000),
            }
          : cookieOptions;

        ctx.cookies.set(refreshCookieName, refreshToken, optsWithExpiry);

        const accessResult = await sessionManager.generateAccessToken(refreshToken);
        if ('error' in accessResult) {
          return ctx.internalServerError();
        }

        const { token: accessToken } = accessResult;

        ctx.body = {
          data: {
            token: accessToken,
            accessToken,
            refreshToken,
            user: getService('user').sanitizeUser(ctx.state.user),
          },
        } satisfies Login.Response;
      } catch (error) {
        strapi.log.error('Failed to create admin refresh session', error);
        return ctx.internalServerError();
      }
    },
  ]),

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

    try {
      const sessionManager = getSessionManager();
      if (!sessionManager) {
        return ctx.internalServerError();
      }
      const userId = String(user.id);
      const { deviceId, rememberMe } = extractDeviceParams(ctx.request.body);

      const { token: refreshToken } = await sessionManager.generateRefreshToken(
        userId,
        deviceId,
        'admin'
      );

      const cookieOptions = getRefreshCookieOptions();
      const optsWithExpiry = rememberMe
        ? {
            ...cookieOptions,
            expires: new Date(Date.now() + getRefreshTokenTTLSeconds() * 1000),
          }
        : cookieOptions;

      ctx.cookies.set(refreshCookieName, refreshToken, optsWithExpiry);

      const accessResult = await sessionManager.generateAccessToken(refreshToken);
      if ('error' in accessResult) {
        return ctx.internalServerError();
      }

      const { token: accessToken } = accessResult;

      ctx.body = {
        data: {
          token: accessToken,
          accessToken,
          refreshToken,
          user: getService('user').sanitizeUser(user),
        },
      } satisfies Register.Response;
    } catch (error) {
      strapi.log.error('Failed to create admin refresh session during register', error);
      return ctx.internalServerError();
    }
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

    try {
      const sessionManager = getSessionManager();
      if (!sessionManager) {
        return ctx.internalServerError();
      }
      const userId = String(user.id);
      const { deviceId, rememberMe } = extractDeviceParams(ctx.request.body);

      const { token: refreshToken } = await sessionManager.generateRefreshToken(
        userId,
        deviceId,
        'admin'
      );

      const cookieOptions = getRefreshCookieOptions();
      const optsWithExpiry = rememberMe
        ? {
            ...cookieOptions,
            expires: new Date(Date.now() + getRefreshTokenTTLSeconds() * 1000),
          }
        : cookieOptions;

      ctx.cookies.set(refreshCookieName, refreshToken, optsWithExpiry);

      const accessResult = await sessionManager.generateAccessToken(refreshToken);
      if ('error' in accessResult) {
        return ctx.internalServerError();
      }

      const { token: accessToken } = accessResult;

      ctx.body = {
        data: {
          token: accessToken,
          accessToken,
          refreshToken,
          user: getService('user').sanitizeUser(user),
        },
      };
    } catch (error) {
      strapi.log.error('Failed to create admin refresh session during register-admin', error);
      return ctx.internalServerError();
    }
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

    // Issue a new admin refresh session and access token after password reset.
    try {
      const sessionManager = getSessionManager();
      if (!sessionManager) {
        return ctx.internalServerError();
      }

      const userId = String(user.id);
      const deviceId = generateDeviceId();

      const { token: refreshToken } = await sessionManager.generateRefreshToken(
        userId,
        deviceId,
        'admin'
      );

      // No rememberMe flow here; expire with session by default
      const cookieOptions = getRefreshCookieOptions();
      ctx.cookies.set(refreshCookieName, refreshToken, cookieOptions);

      const accessResult = await sessionManager.generateAccessToken(refreshToken);
      if ('error' in accessResult) {
        return ctx.internalServerError();
      }

      const { token } = accessResult;

      ctx.body = {
        data: {
          token,
          user: getService('user').sanitizeUser(user),
        },
      } satisfies ResetPassword.Response;
    } catch (err) {
      strapi.log.error('Failed to create admin refresh session during reset-password', err as any);
      return ctx.internalServerError();
    }
  },

  async accessToken(ctx: Context) {
    // Validate optional body to support non-cookie clients
    await validateAccessTokenExchangeInput(ctx.request.body ?? {});

    // Optionally accept refreshToken in request body for non-cookie clients
    const refreshToken = readRefreshTokenFromRequest(ctx);

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

    const bodyDeviceId = ctx.request.body?.deviceId as string | undefined;
    const deviceId = typeof bodyDeviceId === 'string' ? bodyDeviceId : undefined;

    // Clear cookie regardless of token validity
    ctx.cookies.set(refreshCookieName, '', {
      ...getRefreshCookieOptions(),
      expires: new Date(0),
    });

    try {
      const sessionManager = getSessionManager();
      if (sessionManager) {
        const userId = String(ctx.state.user.id);
        await sessionManager.invalidateRefreshToken('admin', userId, deviceId);
      }
    } catch (err) {
      strapi.log.error('Failed to revoke admin sessions during logout', err as any);
    }

    ctx.body = { data: {} };
  },
};
