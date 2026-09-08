import type { Context, Next } from 'koa';
import passport from 'koa-passport';
import compose from 'koa-compose';
import '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { MfaLockedError } from '../services/mfa-errors';
import {
  REFRESH_COOKIE_NAME,
  MFA_TRUST_COOKIE_NAME,
  buildCookieOptionsWithExpiry,
  getSessionManager,
  generateDeviceId,
  getRefreshCookieOptions,
  resolveLogoutDeviceId,
  issueSession,
  clearTrustCookie,
  setTrustCookie,
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

/**
 * Cycle 2 enforcement for a user about to receive a session. Throws `MfaLockedError` (403) on
 * refusal, after emitting `admin.auth.error` like every other failed login; otherwise returns the
 * `issueSession` options carrying the grace deadline when one applies.
 */
const enforceMfaOrThrow = async (
  user: AdminUser
): Promise<{ mfaEnrolment?: { graceUntil: Date } }> => {
  const result = await getService('mfa').enforce(user);

  if (result.outcome === 'refused') {
    const error = new MfaLockedError();
    strapi.eventHub.emit('admin.auth.error', { error, provider: 'local' });
    throw error;
  }

  return result.outcome === 'grace' ? { mfaEnrolment: { graceUntil: result.graceUntil } } : {};
};

/**
 * Cycle 3: what a challenge response advertises as the trust period, or null when the
 * organisation does not offer trusted devices. Read per challenge, never cached, so a settings
 * change shows on the very next login screen.
 */
const offeredTrustDays = async (): Promise<number | null> => {
  const settings = await getService('mfa').trustedDeviceSettings();
  return settings.enabled ? settings.days : null;
};

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
      const userId = String(user.id);

      const mfa = getService('mfa');

      // Enforcement first: a locked account is refused before anything else, and a graced one
      // carries its deadline into the session below. Enrolled users come back as `none` and take
      // the trust check or the challenge branch.
      const sessionOptions = await enforceMfaOrThrow(user);

      if (mfa.isEnabled() && (await mfa.isEnrolled(userId))) {
        // Read once, before anything else in this block: `createChallenge` below already mints a
        // challenge row, so a store-read failure for the offered trust period must not risk a
        // 500 on a response whose challenge already exists (a retry would then mint a second,
        // orphaned one). Cycle 3: a browser trusted after an earlier verified code skips the
        // challenge. Only here (never on reset-password), only after the password check and
        // `enforce`, only for an enrolled user, and only through `consumeTrustedDevice`, which
        // compares the row's owner to this user. A cookie that matches nothing live, belongs to a
        // foreign owner, or is refused outright because the setting is now disabled is cleared so
        // the browser stops presenting it. Written as a fall-through so `login` keeps a single
        // `issueSession` call site (see session-issuing-paths.test.ts).
        const trustedDeviceDays = await offeredTrustDays();

        const trustToken = ctx.cookies.get(MFA_TRUST_COOKIE_NAME);
        const trusted = trustToken ? await mfa.consumeTrustedDevice(userId, trustToken) : false;

        if (!trusted) {
          if (trustToken) {
            clearTrustCookie(ctx);
          }

          const { token: challengeToken, expiresIn } = await mfa.createChallenge(userId);

          // A distinct event, not `admin.auth.success`: the password matched but no session was
          // issued, so audit consumers (EE audit logs, `admin.auth.events` config hooks) must be
          // able to see that this login was gated rather than have it look identical to no
          // attempt at all.
          const sanitizedUser = getService('user').sanitizeUser(user);
          strapi.eventHub.emit('admin.auth.mfa_required', {
            user: sanitizedUser,
            provider: 'local',
          });

          // Deliberately no cookie and no access token here: the challenge token authorises
          // exactly one endpoint (`/login/mfa`) and mints nothing on its own. A cookie set
          // alongside this response would make the whole feature a silent no-op.
          ctx.body = {
            data: {
              mfaRequired: true,
              challengeToken,
              expiresIn,
              trustedDeviceDays,
            },
          } satisfies MfaChallengeResponse;
          return;
        }
      }

      const sanitizedUser = getService('user').sanitizeUser(user);
      strapi.eventHub.emit('admin.auth.success', { user: sanitizedUser, provider: 'local' });

      return issueSession(ctx, user, sessionOptions);
    },
  ]),

  loginMfa: compose([
    // The flag check runs before body validation, matching `controllers/mfa.ts`'s
    // `requireEnabled` ordering: validating first would make flag-off return 400 for a malformed
    // body and 404 for a well-formed one, and that difference is itself a feature-presence tell on
    // a route that is supposed to behave as though it does not exist.
    async (ctx: Context, next: Next) => {
      const mfa = getService('mfa');

      if (!mfa.isEnabled()) {
        return ctx.notFound();
      }

      return next();
    },
    async (ctx: Context) => {
      await validateMfaLoginInput(ctx.request.body ?? {});

      const mfa = getService('mfa');
      const { challengeToken, code, trustDevice, deviceId } = ctx.request
        .body as LoginMfa.Request['body'];

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

      // Cycle 3: any verified challenge may grant trust. The service returns null when the
      // organisation does not offer it, and a stale checkbox is not an error. The raw token
      // exists only here and in the Set-Cookie header.
      if (trustDevice) {
        const granted = await mfa.trustDevice(String(user.id), {
          deviceId,
          userAgent: ctx.request.headers['user-agent'],
        });
        if (granted) {
          setTrustCookie(ctx, granted.token, granted.expiresAt);
        }
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

    const sessionOptions = await enforceMfaOrThrow(user);

    return issueSession(ctx, user, sessionOptions);
  },

  async registerAdmin(ctx: Context) {
    const input = ctx.request.body as RegisterAdmin.Request['body'];

    await validateAdminRegistrationInput(input);

    const user = await getService('user').createFirstAdmin(input);

    strapi.telemetry.send('didCreateFirstAdmin');

    const sessionOptions = await enforceMfaOrThrow(user);

    return issueSession(ctx, user, sessionOptions);
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

    const sessionOptions = await enforceMfaOrThrow(user);

    const mfa = getService('mfa');

    if (mfa.isEnabled() && (await mfa.isEnrolled(String(user.id)))) {
      // Read before `createChallenge` mints its row, for the same reason as `login`: a store-read
      // failure here must not risk a 500 on a response whose challenge already exists.
      const trustedDeviceDays = await offeredTrustDays();

      const { token: challengeToken, expiresIn } = await mfa.createChallenge(String(user.id));

      // Same reasoning as `login`'s gate: forgot-password must not be a way to walk past a
      // second factor, so a reset that lands on an enrolled account gets a challenge instead of
      // a session. Emits the same audit event as the login gate, for the same reason -- a gated
      // reset must not look identical to no attempt at all.
      //
      // No trust check here, by design: a password reset is the classic second-factor bypass,
      // and a trust cookie does not change that. A trust granted through this challenge is still
      // legitimate, a code was verified.
      const sanitizedUser = getService('user').sanitizeUser(user);
      strapi.eventHub.emit('admin.auth.mfa_required', { user: sanitizedUser, provider: 'local' });

      ctx.body = {
        data: {
          mfaRequired: true,
          challengeToken,
          expiresIn,
          trustedDeviceDays,
        },
      } satisfies MfaChallengeResponse;
      return;
    }

    // No rememberMe flow here: force a fresh device id and a session-type (non-persistent) cookie
    // regardless of anything the request body carries.
    return issueSession(ctx, user, {
      deviceId: generateDeviceId(),
      rememberMe: false,
      ...sessionOptions,
    });
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

      // Cycle 2 enforcement on the refresh path: a required user whose grace expired mid-session
      // is locked at their next refresh. Handled as a value, never thrown -- this try/catch turns a
      // throw into a 500. Refusal is a bare 401 (this client never renders a message); every
      // refresh token for the user is invalidated (the just-rotated one included) and the cookie
      // is cleared the way `logout` does, or the browser keeps replaying a dead token.
      const enforcement = await getService('mfa').enforce({ id: rotation.userId });
      if (enforcement.outcome === 'refused') {
        await sessionManager('admin').invalidateRefreshToken(rotation.userId);
        ctx.cookies.set(REFRESH_COOKIE_NAME, '', {
          ...getRefreshCookieOptions(ctx.request.secure),
          expires: new Date(0),
        });
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
