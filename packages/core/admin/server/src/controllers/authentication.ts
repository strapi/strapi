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
  generateDeviceId,
  getRefreshCookieOptions,
  resolveLogoutDeviceId,
  issueSession,
} from '../../../shared/utils/session-auth';

import {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateLoginSessionInput,
} from '../validation/authentication';
import { validateMfaLoginInput } from '../validation/authentication/mfa';

import type {
  ForgotPassword,
  Login,
  LoginMfa,
  MfaChallengeResponse,
  Register,
  RegisterAdmin,
  RegistrationInfo,
  ResetPassword,
} from '../../../shared/contracts/authentication';
import { AdminUser } from '../../../shared/contracts/shared';

const { ApplicationError, RateLimitError, ValidationError } = errors;

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

        // Not `admin.auth.success` here: the second-factor check below can still gate this
        // login, and that event must fire only when a session is actually issued (see the
        // next step and `loginMfa`).
        return next();
      })(ctx, next);
    },
    async (ctx: Context) => {
      const { user } = ctx.state as { user: AdminUser };

      const mfa = getService('mfa');

      if (mfa.isEnabled() && (await mfa.isEnrolled(String(user.id)))) {
        const { token: challengeToken, expiresIn } = await mfa.createChallenge(String(user.id));

        // A distinct event, not `admin.auth.success`: the password matched but no session was
        // issued, so audit consumers (EE audit logs, `admin.auth.events` config hooks) must be
        // able to see that this login was gated rather than have it look identical to no
        // attempt at all.
        const sanitizedUser = getService('user').sanitizeUser(user);
        strapi.eventHub.emit('admin.auth.mfa_required', { user: sanitizedUser, provider: 'local' });

        // Deliberately no cookie and no access token here: the challenge token authorises
        // exactly one endpoint (`/login/mfa`) and mints nothing on its own. A cookie set
        // alongside this response would make the whole feature a silent no-op.
        ctx.body = {
          data: { mfaRequired: true, challengeToken, expiresIn },
        } satisfies MfaChallengeResponse;
        return;
      }

      const sanitizedUser = getService('user').sanitizeUser(user);
      strapi.eventHub.emit('admin.auth.success', { user: sanitizedUser, provider: 'local' });

      return issueSession(ctx, user);
    },
  ]),

  loginMfa: compose([
    async (ctx: Context, next: Next) => {
      await validateMfaLoginInput(ctx.request.body ?? {});
      return next();
    },
    async (ctx: Context) => {
      const mfa = getService('mfa');

      if (!mfa.isEnabled()) {
        return ctx.notFound();
      }

      const { challengeToken, code } = ctx.request.body as LoginMfa.Request['body'];

      // The validator no longer trims `code` (see validation/authentication/mfa.ts): trim it
      // here instead, after validation and before it reaches `verifyChallenge`.
      const result = await mfa.verifyChallenge(challengeToken, code.trim());

      if (!result.ok) {
        if (result.reason === 'throttled') {
          throw new RateLimitError();
        }

        // One generic message for every other outcome ('unusable', 'exhausted', 'invalid') so a
        // caller cannot tell an expired challenge from a wrong code from an exhausted one.
        throw new ValidationError('Invalid code');
      }

      const user = await getService('user').findOne(result.userId);

      // `/login` is gated by the local passport strategy's `checkCredentials`
      // (services/auth.ts), which rejects a missing user or `isActive !== true`.
      // `verifyChallenge` above has no equivalent gate, and a challenge can outlive an account
      // being disabled during its (default five-minute) `challengeTtl` window, so the same
      // account check is repeated here. Mirrors `checkCredentials` exactly -- it does not
      // consult `blocked` -- and reuses its generic message: revealing "this account is
      // disabled" would be a new enumeration channel on top of the one `verifyChallenge`
      // already closes.
      if (!user || user.isActive !== true) {
        throw new ValidationError('Invalid code');
      }

      const sanitizedUser = getService('user').sanitizeUser(user);
      strapi.eventHub.emit('admin.auth.success', { user: sanitizedUser, provider: 'local' });

      return issueSession(ctx, user);
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

    return issueSession(ctx, user);
  },

  async registerAdmin(ctx: Context) {
    const input = ctx.request.body as RegisterAdmin.Request['body'];

    await validateAdminRegistrationInput(input);

    const user = await getService('user').createFirstAdmin(input);

    strapi.telemetry.send('didCreateFirstAdmin');

    return issueSession(ctx, user);
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

    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    try {
      // Invalidate all existing sessions before creating a new one.
      await sessionManager('admin').invalidateRefreshToken(String(user.id));
    } catch (err) {
      strapi.log.error('Failed to create admin refresh session during reset-password', err as any);
      return ctx.internalServerError();
    }

    const mfa = getService('mfa');

    if (mfa.isEnabled() && (await mfa.isEnrolled(String(user.id)))) {
      const { token: challengeToken, expiresIn } = await mfa.createChallenge(String(user.id));

      // Same reasoning as `login`'s gate: forgot-password must not be a way to walk past a
      // second factor, so a reset that lands on an enrolled account gets a challenge instead of
      // a session. Emits the same audit event as the login gate, for the same reason -- a gated
      // reset must not look identical to no attempt at all.
      const sanitizedUser = getService('user').sanitizeUser(user);
      strapi.eventHub.emit('admin.auth.mfa_required', { user: sanitizedUser, provider: 'local' });

      ctx.body = {
        data: { mfaRequired: true, challengeToken, expiresIn },
      } satisfies MfaChallengeResponse;
      return;
    }

    // No rememberMe flow here: force a fresh device id and a session-type (non-persistent) cookie
    // regardless of anything the request body carries.
    return issueSession(ctx, user, { deviceId: generateDeviceId(), rememberMe: false });
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

    // Clear cookie regardless of token validity
    ctx.cookies.set(REFRESH_COOKIE_NAME, '', {
      ...getRefreshCookieOptions(ctx.request.secure),
      expires: new Date(0),
    });

    try {
      const sessionManager = getSessionManager();
      if (sessionManager) {
        const userId = String(ctx.state.user.id);
        const bodyDeviceId = (ctx.request.body as { deviceId?: string } | undefined)?.deviceId;
        const sessionId = (ctx.state.session as { id?: string } | undefined)?.id;

        if (typeof bodyDeviceId === 'string' && bodyDeviceId.length > 0) {
          const deviceId = await resolveLogoutDeviceId(userId, sessionId, bodyDeviceId);
          await sessionManager('admin').invalidateRefreshToken(userId, deviceId);
        } else {
          await sessionManager('admin').invalidateRefreshToken(userId);
        }
      }
    } catch (err) {
      strapi.log.error('Failed to revoke admin sessions during logout', err as any);
    }

    ctx.body = { data: {} };
  },
};
