import type { Context, Next } from 'koa';
import passport from 'koa-passport';
import compose from 'koa-compose';
import '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import {
  REFRESH_COOKIE_NAME,
  buildCookieOptionsWithExpiry,
  getSessionManager,
  extractDeviceParams,
  generateDeviceId,
  getRefreshCookieOptions,
} from '../../../shared/utils/session-auth';

import {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateResetPasswordInput,
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

export default {
  login: compose([
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

        const { token: refreshToken, absoluteExpiresAt } = await sessionManager(
          'admin'
        ).generateRefreshToken(userId, deviceId, {
          type: rememberMe ? 'refresh' : 'session',
        });

        const cookieOptions = buildCookieOptionsWithExpiry(
          rememberMe ? 'refresh' : 'session',
          absoluteExpiresAt,
          ctx.request.secure
        );
        ctx.cookies.set(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

        const accessResult = await sessionManager('admin').generateAccessToken(refreshToken);
        if ('error' in accessResult) {
          return ctx.internalServerError();
        }

        const { token: accessToken } = accessResult;

        ctx.body = {
          data: {
            token: accessToken,
            accessToken,
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

      const { token: refreshToken, absoluteExpiresAt } = await sessionManager(
        'admin'
      ).generateRefreshToken(userId, deviceId, { type: rememberMe ? 'refresh' : 'session' });

      const cookieOptions = buildCookieOptionsWithExpiry(
        rememberMe ? 'refresh' : 'session',
        absoluteExpiresAt,
        ctx.request.secure
      );
      ctx.cookies.set(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

      const accessResult = await sessionManager('admin').generateAccessToken(refreshToken);
      if ('error' in accessResult) {
        return ctx.internalServerError();
      }

      const { token: accessToken } = accessResult;

      ctx.body = {
        data: {
          token: accessToken,
          accessToken,
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

      const { token: refreshToken, absoluteExpiresAt } = await sessionManager(
        'admin'
      ).generateRefreshToken(userId, deviceId, { type: rememberMe ? 'refresh' : 'session' });

      const cookieOptions = buildCookieOptionsWithExpiry(
        rememberMe ? 'refresh' : 'session',
        absoluteExpiresAt,
        ctx.request.secure
      );
      ctx.cookies.set(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

      const accessResult = await sessionManager('admin').generateAccessToken(refreshToken);
      if ('error' in accessResult) {
        return ctx.internalServerError();
      }

      const { token: accessToken } = accessResult;

      ctx.body = {
        data: {
          token: accessToken,
          accessToken,
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

      // Invalidate all existing sessions before creating a new one
      await sessionManager('admin').invalidateRefreshToken(userId);

      const { token: refreshToken, absoluteExpiresAt } = await sessionManager(
        'admin'
      ).generateRefreshToken(userId, deviceId, { type: 'session' });

      // No rememberMe flow here; expire with session by default (session cookie)
      const cookieOptions = buildCookieOptionsWithExpiry(
        'session',
        absoluteExpiresAt,
        ctx.request.secure
      );
      ctx.cookies.set(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

      const accessResult = await sessionManager('admin').generateAccessToken(refreshToken);
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
    const refreshToken = ctx.cookies.get(REFRESH_COOKIE_NAME);

    if (!refreshToken) {
      return ctx.unauthorized('Missing refresh token');
    }

    try {
      const sessionManager = getSessionManager();
      if (!sessionManager) {
        return ctx.internalServerError();
      }

      // Single-use renewal: rotate on access exchange, then create access token
      // from the new refresh token
      const rotation = await sessionManager('admin').rotateRefreshToken(refreshToken);
      if ('error' in rotation) {
        return ctx.unauthorized('Invalid refresh token');
      }

      const result = await sessionManager('admin').generateAccessToken(rotation.token);
      if ('error' in result) {
        return ctx.unauthorized('Invalid refresh token');
      }

      const { token } = result;
      // Preserve session-vs-remember mode using rotation.type and rotation.absoluteExpiresAt
      const opts = buildCookieOptionsWithExpiry(
        rotation.type,
        rotation.absoluteExpiresAt,
        ctx.request.secure
      );

      ctx.cookies.set(REFRESH_COOKIE_NAME, rotation.token, opts);
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
    ctx.cookies.set(REFRESH_COOKIE_NAME, '', {
      ...getRefreshCookieOptions(ctx.request.secure),
      expires: new Date(0),
    });

    try {
      const sessionManager = getSessionManager();
      if (sessionManager) {
        const userId = String(ctx.state.user.id);
        await sessionManager('admin').invalidateRefreshToken(userId, deviceId);
      }
    } catch (err) {
      strapi.log.error('Failed to revoke admin sessions during logout', err as any);
    }

    ctx.body = { data: {} };
  },
};
