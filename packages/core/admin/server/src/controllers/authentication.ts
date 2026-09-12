import type { Context, Next } from 'koa';
import passport from 'koa-passport';
import compose from 'koa-compose';
import '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { MfaLockedError } from '../services/mfa-errors';
import { PASSKEY_VERIFY_FAILED } from '../services/mfa-passkeys';
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
import {
  validateMfaLoginInput,
  validateMfaWebauthnLoginInput,
  validateMfaWebauthnOptionsInput,
} from '../validation/authentication/mfa';

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
import type { MfaWebauthnLogin, MfaWebauthnOptions } from '../../../shared/contracts/mfa';
import { AdminUser } from '../../../shared/contracts/shared';

const { ApplicationError, RateLimitError, ValidationError } = errors;

/** Throws `MfaLockedError` on refusal, after emitting `admin.auth.error` like any other failed
 * login; otherwise returns the `issueSession` options carrying the grace deadline. */
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

/** Read per challenge, never cached, so a settings change shows on the next login screen. */
const offeredTrustDays = async (): Promise<number | null> => {
  const settings = await getService('mfa').trustedDeviceSettings();
  return settings.enabled ? settings.days : null;
};

/** The RP must resolve as well as the account holding a credential, so a misconfigured deployment
 * never offers a button every ceremony would refuse. */
const passkeyAvailableFor = async (userId: string): Promise<boolean> =>
  (await getService('mfa').countPasskeys(userId)) > 0 && getService('mfa').passkeysConfigured();

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

        // Not `admin.auth.success`: the second-factor check below can still gate this login, and that
        // event fires only when a session is issued.
        return next();
      })(ctx, next);
    },
    async (ctx: Context) => {
      const { user } = ctx.state as { user: AdminUser };
      const userId = String(user.id);

      const mfa = getService('mfa');

      // Enforcement first: a locked account is refused before anything else.
      const sessionOptions = await enforceMfaOrThrow(user);

      if (mfa.isEnabled() && (await mfa.isEnrolled(userId))) {
        // Every store read this response needs happens *before* `createChallenge` mints its row, so a
        // blip cannot 500 a response whose challenge already exists and leave the retry minting a second,
        // orphaned one. A cookie that matches nothing live, has a foreign owner, or is refused because
        // the setting is now off is cleared so the browser stops presenting it.
        const trustedDeviceDays = await offeredTrustDays();

        const trustToken = ctx.cookies.get(MFA_TRUST_COOKIE_NAME);
        const trusted = trustToken ? await mfa.consumeTrustedDevice(userId, trustToken) : false;

        if (!trusted) {
          if (trustToken) {
            clearTrustCookie(ctx);
          }

          // Before `createChallenge`, for the reason `trustedDeviceDays` above gives. Scoped inside the
          // trust-cookie branch, unlike that one: a trusted browser discards this value, so paying a
          // per-user COUNT and a new 500 surface for it there would be waste.
          const passkeyAvailable = await passkeyAvailableFor(userId);

          const { token: challengeToken, expiresIn } = await mfa.createChallenge(userId);

          // A distinct event: the password matched but no session was issued, and audit consumers must be
          // able to tell that from no attempt at all.
          const sanitizedUser = getService('user').sanitizeUser(user);
          strapi.eventHub.emit('admin.auth.mfa_required', {
            user: sanitizedUser,
            provider: 'local',
          });

          // No cookie and no access token: a cookie set alongside this response would make the whole
          // feature a silent no-op.
          ctx.body = {
            data: {
              mfaRequired: true,
              challengeToken,
              expiresIn,
              trustedDeviceDays,
              passkeyAvailable,
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
    async (ctx: Context) => {
      await validateMfaLoginInput(ctx.request.body ?? {});

      const mfa = getService('mfa');
      const { challengeToken, code, trustDevice, deviceId } = ctx.request
        .body as LoginMfa.Request['body'];

      // The validator deliberately does not trim, so a whitespace-only code still fails `required`.
      const result = await mfa.verifyChallenge(challengeToken, code.trim());

      if (!result.ok) {
        if (result.reason === 'throttled') {
          throw new RateLimitError();
        }

        // One generic message, so a caller cannot tell an expired challenge from a wrong code.
        throw new ValidationError('Invalid code');
      }

      const user = await getService('user').findOne(result.userId);

      // A challenge can outlive an account being disabled inside its `challengeTtl` window, and
      // `verifyChallenge` has no equivalent of `checkCredentials`' gate. Mirrors it exactly -- it does
      // not consult `blocked` -- and reuses its generic message rather than open an enumeration channel.
      if (!user || user.isActive !== true) {
        throw new ValidationError('Invalid code');
      }

      // The service returns null when the organisation does not offer trust, and a stale checkbox is
      // not an error. The raw token exists only here and in the Set-Cookie header.
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

  /**
   * Start an authentication ceremony against a challenge `/login` or `/reset-password`
   * already minted. Unauthenticated and rate-limited; the challenge token is the only credential.
   * Charges no attempt -- it evaluates no factor -- but the service still checks the throttle and
   * the challenge's usability, so it cannot be used as an unmetered oracle.
   */
  loginMfaWebauthnOptions: compose([
    async (ctx: Context) => {
      await validateMfaWebauthnOptionsInput(ctx.request.body ?? {});
      const { challengeToken } = ctx.request.body as MfaWebauthnOptions.Request['body'];

      const options = await getService('mfa').authenticationOptions(challengeToken);

      ctx.body = { data: options } satisfies MfaWebauthnOptions.Response;
    },
  ]),

  /** Not folded into `verifyChallenge`, which dispatches on the submitted code's own shape -- an
   * assertion is not a code. Both counters are still charged. */
  loginMfaWebauthn: compose([
    async (ctx: Context) => {
      await validateMfaWebauthnLoginInput(ctx.request.body ?? {});

      const mfa = getService('mfa');
      // `rememberMe` is read from the body by `issueSession` itself, but must still be in the
      // validator or `.noUnknown()` rejects the request.
      const { challengeToken, assertion, trustDevice, deviceId } = ctx.request
        .body as MfaWebauthnLogin.Request['body'];

      // One generic error for every outcome but throttling, so no caller can tell an expired challenge
      // from a wrong credential.
      const { userId } = await mfa.verifyAssertion(challengeToken, assertion);

      const user = await getService('user').findOne(userId);

      // What `loginMfa` does, for the same reason. Before the trust grant, or a deactivated account
      // also collects a trust cookie good for the whole configured window.
      if (!user || user.isActive !== true) {
        throw new ValidationError(PASSKEY_VERIFY_FAILED);
      }

      // Byte for byte what `/login/mfa` does: the trust grant is factor-agnostic.
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
      // Before `createChallenge` mints its row, for the reason `login` gives.
      const trustedDeviceDays = await offeredTrustDays();
      const passkeyAvailable = await passkeyAvailableFor(String(user.id));

      const { token: challengeToken, expiresIn } = await mfa.createChallenge(String(user.id));

      // Forgot-password must not be a way to walk past a second factor, so a reset landing on an
      // enrolled account gets a challenge, not a session.
      //
      // No trust check here by design: a password reset is the classic second-factor bypass, and a
      // trust cookie does not change that.
      const sanitizedUser = getService('user').sanitizeUser(user);
      strapi.eventHub.emit('admin.auth.mfa_required', { user: sanitizedUser, provider: 'local' });

      ctx.body = {
        data: {
          mfaRequired: true,
          challengeToken,
          expiresIn,
          trustedDeviceDays,
          passkeyAvailable,
        },
      } satisfies MfaChallengeResponse;
      return;
    }

    // A fresh device id and a non-persistent cookie, whatever the body carries.
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

      // Enforcement on the refresh path: a required user whose grace expired mid-session
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
