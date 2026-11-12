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
 * - a two-factor verification made or vouched for: an authenticator code, an emailed code or a
 *   backup code (a sign-in challenge, the confirmation of an enrollment, or a code given again
 *   while signed in)
 * - was made by a passkey sign-in, which is possession and the device's own check in one
 * - was made by a password sign-in that a trusted device let skip the challenge: the two-factor
 *   plugin's own after-hook has run by then and has left a session in place for a user with
 *   two-factor on only when the trusted-device cookie was valid (this plugin is installed after it)
 * - replaces a session that had it: changing a password makes a new session for the caller
 *
 * Every other session is `false`, a session made by `createSession` included. The marker is written
 * right after the session exists and before the response leaves, so no client holds a token for a
 * session that is not marked yet. A write that fails fails the request: an unmarked session only
 * ever means a refusal later.
 */
import { APIError, createAuthMiddleware } from 'better-auth/api';
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

const PASSKEY_SIGN_IN_PATH = '/passkey/verify-authentication';

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
    // A challenge or an enrollment makes a session; a code given again while signed in vouches for
    // the one that is there
    return createdSession(ctx) ?? callerSession(ctx);
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
