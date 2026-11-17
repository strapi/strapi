import type { Context, Next } from 'koa';
import passport from 'koa-passport';
import compose from 'koa-compose';
import '@strapi/types';
import type { Data } from '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { PASSKEY_VERIFY_FAILED } from '../services/mfa-passkeys';
import { emitLoginFailure, type LoginFailureReason } from '../audit-logs/auth';
import { USER_NOT_ACTIVE_MESSAGE } from '../services/auth';
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
import { MFA_ERROR_CODES } from '../../../shared/utils/mfa-error-codes';

const { ApplicationError, RateLimitError, ValidationError } = errors;

/**
 * `issueSession`, then hands the security events this login recorded (a recovery code, a trusted
 * device) to the login family it just created, which must not then notify about them.
 */
const issueAdminSession = async (...args: Parameters<typeof issueSession>): Promise<void> => {
  const issued = await issueSession(...args);
  if (issued) {
    await getService('mfa').claimRequestEvents(issued.familyId);
  }
};

/** Throws 403 `MFA_LOCKED` on refusal, after `admin.auth.error`; else the grace deadline options. */
const enforceMfaOrThrow = async (
  user: AdminUser
): Promise<{ mfaEnrolment?: { graceUntil: Date } }> => {
  const result = await getService('mfa').enforce(user);

  if (result.outcome === 'refused') {
    // `PolicyError`: the authorize middleware turns other 403s into a bare `ctx.forbidden()`
    const error = new errors.PolicyError(
      'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.',
      { code: MFA_ERROR_CODES.LOCKED }
    );
    emitLoginFailure(
      { strapi },
      {
        error,
        provider: 'local',
        reason: 'mfa_locked',
        ...(user.email ? { user: { id: user.id, email: user.email } } : {}),
      }
    );
    throw error;
  }

  return result.outcome === 'grace' ? { mfaEnrolment: { graceUntil: result.graceUntil } } : {};
};

/**
 * Commits a password reset the challenge carried (see `PasswordResetResult`), and returns the
 * session options a reset gets: a fresh device id and a non-persistent cookie, whatever the body
 * carries, exactly as an unenrolled reset does. Nothing to do for an ordinary login.
 */
const commitStagedReset = async (
  user: AdminUser,
  pendingPasswordHash: string | undefined
): Promise<{ deviceId?: string; rememberMe?: boolean }> => {
  if (!pendingPasswordHash) {
    return {};
  }
  await getService('auth').commitStagedPasswordReset(user.id, pendingPasswordHash);
  return { deviceId: generateDeviceId(), rememberMe: false };
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

/**
 * Emits `admin.auth.error` without delaying the response. The account is looked up by
 * the email of the request, as the local strategy does, because passport does not pass
 * the user along with an error.
 */
const emitLocalLoginFailure = (ctx: Context, error: Error, reason: LoginFailureReason) => {
  const { email } = (ctx.request.body ?? {}) as { email?: unknown };

  const emit = (user?: { id: Data.ID; email: string } | null) =>
    emitLoginFailure(
      { strapi },
      {
        error,
        reason,
        provider: 'local',
        ...(user ? { user: { id: user.id, email: user.email } } : {}),
      }
    );

  // A failed lookup still emits, without the account
  Promise.resolve()
    .then(() =>
      typeof email === 'string'
        ? strapi.db
            .query('admin::user')
            .findOne({ select: ['id', 'email'], where: { email: email.toLowerCase() } })
        : null
    )
    .then(emit, () => emit());
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
          emitLocalLoginFailure(
            ctx,
            err,
            err.details?.code === 'LOGIN_NOT_ALLOWED' ? 'login_not_allowed' : 'unexpected_error'
          );
          // if this is a recognized error, allow it to bubble up to user
          if (err.details?.code === 'LOGIN_NOT_ALLOWED') {
            throw err;
          }

          // for all other errors throw a generic error to prevent leaking info
          return ctx.notImplemented();
        }

        if (!user) {
          emitLocalLoginFailure(
            ctx,
            new Error(info.message),
            info.message === USER_NOT_ACTIVE_MESSAGE ? 'account_inactive' : 'invalid_credentials'
          );
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
        // Every store read happens before `createChallenge`, so a failure cannot orphan a challenge.
        // A trust cookie that is refused is cleared.
        const trustedDeviceDays = await offeredTrustDays();

        const trustToken = ctx.cookies.get(MFA_TRUST_COOKIE_NAME);
        const trusted = trustToken ? await mfa.consumeTrustedDevice(userId, trustToken) : false;

        if (!trusted) {
          if (trustToken) {
            clearTrustCookie(ctx);
          }

          // Before `createChallenge`, as above; a trusted browser never needs it
          const passkeyAvailable = await passkeyAvailableFor(userId);

          const { token: challengeToken, expiresIn } = await mfa.createChallenge(userId);

          // The password matched but no session was issued
          const sanitizedUser = getService('user').sanitizeUser(user);
          strapi.eventHub.emit('admin.auth.mfa_required', {
            user: sanitizedUser,
            provider: 'local',
          });

          // No cookie and no access token until the second factor passes
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

      return issueAdminSession(ctx, user, sessionOptions);
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
        throw new ValidationError('Invalid code', { code: MFA_ERROR_CODES.INVALID_CODE });
      }

      const user = await getService('user').findOne(result.userId);

      // The account may have been deactivated since the challenge; mirrors `checkCredentials`
      if (!user || user.isActive !== true) {
        throw new ValidationError('Invalid code', { code: MFA_ERROR_CODES.INVALID_CODE });
      }

      // A staged password reset commits now, before the trust grant it would otherwise revoke
      const reset = await commitStagedReset(user, result.pendingPasswordHash);

      // Null when trust is not offered; the raw token exists only here and in Set-Cookie
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

      return issueAdminSession(ctx, user, reset);
    },
  ]),

  /**
   * Starts a passkey ceremony against a challenge `/login` or `/reset-password` minted. Charges no
   * attempt, but the service still checks the throttle and the challenge.
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
      const { challengeToken, assertion, trustDevice, deviceId } = ctx.request
        .body as MfaWebauthnLogin.Request['body'];

      // One generic error for every outcome but throttling
      const { userId, pendingPasswordHash } = await mfa.verifyAssertion(challengeToken, assertion);

      const user = await getService('user').findOne(userId);

      // As in `loginMfa`, before the trust grant
      if (!user || user.isActive !== true) {
        throw new ValidationError(PASSKEY_VERIFY_FAILED);
      }

      // As in `loginMfa`, and before the trust grant for the same reason.
      const reset = await commitStagedReset(user, pendingPasswordHash);

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

      return issueAdminSession(ctx, user, reset);
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

    return issueAdminSession(ctx, user, sessionOptions);
  },

  async registerAdmin(ctx: Context) {
    const input = ctx.request.body as RegisterAdmin.Request['body'];

    await validateAdminRegistrationInput(input);

    const user = await getService('user').createFirstAdmin(input);

    strapi.telemetry.send('didCreateFirstAdmin');

    const sessionOptions = await enforceMfaOrThrow(user);

    return issueAdminSession(ctx, user, sessionOptions);
  },

  async forgotPassword(ctx: Context) {
    const input = ctx.request.body as ForgotPassword.Request['body'];

    await validateForgotPasswordInput(input);
    // The promise below can settle after Strapi is destroyed, so capture the logger now.
    const logger = strapi.log;

    // Not awaited: the response must not reveal whether the email exists. The call runs
    // synchronously so a broken service still surfaces as a 500; only a rejection of the
    // returned promise is caught here, since nothing else would handle it.
    Promise.resolve(getService('auth').forgotPassword(input)).catch((error: unknown) => {
      logger.error('Failed to process the forgot-password request', { error });
    });

    ctx.status = 204;
  },

  async resetPassword(ctx: Context) {
    const input = ctx.request.body as ResetPassword.Request['body'];

    await validateResetPasswordInput(input);

    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    const { user, pendingPasswordHash } = await getService('auth').resetPassword(input);
    const mfa = getService('mfa');

    if (pendingPasswordHash) {
      // An enrolled account gets a challenge, not a session: the new password is staged on it and
      // commits only once the second factor passes. No trust cookie check on a reset, by design.
      const trustedDeviceDays = await offeredTrustDays();
      const passkeyAvailable = await passkeyAvailableFor(String(user.id));

      const { token: challengeToken, expiresIn } = await mfa.createChallenge(String(user.id), {
        pendingPasswordHash,
      });

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

    try {
      // Invalidate all existing sessions before creating a new one
      await sessionManager('admin').invalidateRefreshToken(String(user.id));
    } catch (err) {
      strapi.log.error('Failed to create admin refresh session during reset-password', err as any);
      return ctx.internalServerError();
    }

    const sessionOptions = await enforceMfaOrThrow(user);

    // A fresh device id and a non-persistent cookie, whatever the body carries.
    return issueAdminSession(ctx, user, {
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

      // Enforcement before rotation, so a failure here does not spend the presented token. A
      // refusal is a bare 401 that invalidates every refresh token and clears the cookie.
      const validation = await sessionManager('admin').validateRefreshToken(refreshToken);
      if (!validation.isValid || !validation.userId) {
        return ctx.unauthorized('Invalid refresh token');
      }

      const mfa = getService('mfa');
      // A login an identity provider authenticated is exempt, as it was at the SSO callback: the
      // provider owns the second factor (see `buildAdminSessionMetadata`).
      const family = await mfa.sessionFamily(validation.sessionId);
      if (!family?.sso) {
        const enforcement = await mfa.enforce({ id: validation.userId });
        if (enforcement.outcome === 'refused') {
          await sessionManager('admin').invalidateRefreshToken(validation.userId);
          ctx.cookies.set(REFRESH_COOKIE_NAME, '', {
            ...getRefreshCookieOptions(ctx.request.secure),
            expires: new Date(0),
          });
          return ctx.unauthorized('Invalid refresh token');
        }
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
