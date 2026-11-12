/**
 * `second-factor`: a session records whether it was made by a second factor.
 *
 * Better Auth asks for the second factor only after `/sign-in/email`, `/sign-in/username` and
 * `/sign-in/phone-number`. A user with two-factor on who signs in any other way (a provider, a
 * magic link, an emailed code) gets a session with no challenge at all, and so does a client that
 * holds an old Users & Permissions token. A role that requires two-factor needs to tell those
 * sessions from the ones that passed it, so the session carries `twoFactorVerified` (never set by a
 * request, `false` until this plugin sets it). It is `true` for a session that:
 *
 * - the two-factor challenge made after a password sign-in: the verify request carried no session
 *   of its own, only Better Auth's challenge cookie, whichever factor answered it
 * - confirms an authenticator (TOTP) enrollment, which asked for the user's password first
 * - was made by a password sign-in that a trusted device let skip the challenge: the two-factor
 *   plugin's own after-hook has run by then and has left a session in place for a user with
 *   two-factor on only when the trusted-device cookie was valid (this plugin is installed after it)
 * - was made by a passkey sign-in, which is possession and the device's own check in one
 * - replaces a session that had it: changing a password makes a new session for the caller
 *
 * Nothing a signed-in session does can earn the mark for itself. A code given while signed in (an
 * authenticator code, a backup code, above all an emailed one: whoever holds the mailbox that signed
 * a session in also gets that code) marks nothing, and neither does turning two-factor on with an
 * emailed code alone. A user with two-factor on cannot register a passkey from a session that is
 * not marked, because a passkey sign-in is counted as both factors.
 *
 * Every other session is `false`, a session made by `createSession` included. The marker is written
 * right after the session exists and before the response leaves, so no client holds a token for a
 * session that is not marked yet. A write that fails fails the request: an unmarked session only
 * ever means a refusal later.
 */
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

interface SessionRef {
  session: { id: string; twoFactorVerified?: unknown };
  user: { twoFactorEnabled?: unknown };
}

/** The two-factor endpoints that check a code. Each one answers an error for a code that is wrong. */
const VERIFY_PATHS = new Set([
  '/two-factor/verify-totp',
  '/two-factor/verify-otp',
  '/two-factor/verify-backup-code',
]);

const TOTP_VERIFY_PATH = '/two-factor/verify-totp';

const PASSKEY_SIGN_IN_PATH = '/passkey/verify-authentication';

/** Both steps of registering a passkey: the options for the browser, and the browser's answer. */
const PASSKEY_REGISTRATION_PATHS = new Set([
  '/passkey/generate-register-options',
  '/passkey/verify-registration',
]);

export const PASSKEY_NEEDS_SECOND_FACTOR_MESSAGE =
  'Sign in again with your second factor before you add a passkey: a passkey counts as both factors.';

/** The sign-ins Better Auth's two-factor plugin puts a challenge behind. */
const PASSWORD_SIGN_IN_PATHS = new Set([
  '/sign-in/email',
  '/sign-in/username',
  '/sign-in/phone-number',
]);

const CHANGE_PASSWORD_PATH = '/change-password';

const AFTER_PATHS = new Set([
  ...VERIFY_PATHS,
  PASSKEY_SIGN_IN_PATH,
  ...PASSWORD_SIGN_IN_PATHS,
  CHANGE_PASSWORD_PATH,
]);

const failed = (ctx: HookContext) => ctx.context.returned instanceof APIError;

/** The session the endpoint left in place for the caller, if it made one. */
const createdSession = (ctx: HookContext): SessionRef | null =>
  (ctx.context.newSession as SessionRef | null | undefined) ?? null;

/** The session the request was made with, as the endpoint's session middleware read it. */
const callerSession = (ctx: HookContext): SessionRef | null =>
  (ctx.context.session as SessionRef | null | undefined) ?? null;

/** The session this request earned the mark for, or `null`. */
const markedSession = (ctx: HookContext): SessionRef | null => {
  const { path } = ctx;

  if (VERIFY_PATHS.has(path)) {
    // A code given while signed in leaves the session as it is: no session is made, and there is
    // nothing to mark. A session is made by the challenge, and by the confirmation of an
    // enrollment.
    const created = createdSession(ctx);

    if (!created) {
      return null;
    }

    // No session on the request: the challenge that follows a password sign-in
    if (!callerSession(ctx)) {
      return created;
    }

    // A session on the request: an enrollment is confirmed by the authenticator code that the
    // password-protected setup produced. An emailed code that turns two-factor on has no second
    // factor behind it, and a backup code makes no session.
    return path === TOTP_VERIFY_PATH ? created : null;
  }

  if (path === PASSKEY_SIGN_IN_PATH) {
    return createdSession(ctx);
  }

  if (PASSWORD_SIGN_IN_PATHS.has(path)) {
    const created = createdSession(ctx);

    // A password sign-in of a user with two-factor on that still has a session passed the trusted
    // device check: the challenge would have removed it
    return created?.user.twoFactorEnabled === true ? created : null;
  }

  if (path === CHANGE_PASSWORD_PATH) {
    const created = createdSession(ctx);

    return created && callerSession(ctx)?.session.twoFactorVerified === true ? created : null;
  }

  return null;
};

export const secondFactor = (): BetterAuthPlugin => ({
  id: 'second-factor',

  schema: {
    session: {
      fields: {
        twoFactorVerified: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
  },

  hooks: {
    before: [
      {
        matcher: (context) => PASSKEY_REGISTRATION_PATHS.has(context.path as string),
        handler: createAuthMiddleware(async (ctx) => {
          // Read from the store, not from a cached cookie: the mark is what is being asked about
          const current = (await getAuthoritativeSessionFromCtx(ctx)) as SessionRef | null;

          // Better Auth refuses a request with no session itself
          if (!current || current.user.twoFactorEnabled !== true) {
            return;
          }

          if (current.session.twoFactorVerified !== true) {
            throw new APIError('FORBIDDEN', {
              code: 'TWO_FACTOR_REQUIRED',
              message: PASSKEY_NEEDS_SECOND_FACTOR_MESSAGE,
            });
          }
        }),
      },
    ],
    after: [
      {
        matcher: (context) => AFTER_PATHS.has(context.path as string),
        handler: createAuthMiddleware(async (ctx) => {
          if (failed(ctx)) {
            return;
          }

          const target = markedSession(ctx);

          if (!target || target.session.twoFactorVerified === true) {
            return;
          }

          await ctx.context.adapter.update({
            model: 'session',
            where: [{ field: 'id', value: target.session.id }],
            update: { twoFactorVerified: true },
          });

          target.session.twoFactorVerified = true;
        }),
      },
    ],
  },
});
