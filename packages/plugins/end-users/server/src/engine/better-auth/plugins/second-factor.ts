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
 * - was made by a passkey sign-in in which the authenticator verified the user (a fingerprint, a face,
 *   a PIN: the flag in the signed authenticator data), which is possession and the device's own
 *   check in one. A passkey that only proved possession still signs in, but the session is not marked
 * - replaces a session that had it: changing a password makes a new session for the caller
 *
 * Nothing a signed-in session does can earn the mark for itself. A code given while signed in (an
 * authenticator code, a backup code, above all an emailed one: whoever holds the mailbox that signed
 * a session in also gets that code) marks nothing, and neither does turning two-factor on with an
 * emailed code alone. Confirming an enrollment is the one exception, and it is the one that makes a
 * new session in place of the caller's: a session that Better Auth only refreshed keeps its id and
 * is not marked. The confirmation has an attempt cap of its own, counted per user in the lockout
 * counter and kept apart from the sign-in lock, so a session that holds one factor cannot guess
 * its way to the other. A user with two-factor on cannot register a passkey from a session that is
 * not marked, because a passkey sign-in is counted as both factors.
 *
 * The emailed code is refused at the challenge for a user who has confirmed an authenticator: they
 * answer it with the authenticator or a backup code. Otherwise the mailbox would be enough, since
 * the mailbox also resets the password. A user who set up two-factor with the emailed code alone
 * has the mailbox as their second factor, and keeps it.
 *
 * Changing the email address needs a confirmed current address, and for a user with two-factor on a
 * session that passed it: an unconfirmed address has no mailbox that approves the change.
 *
 * While two-factor is on, turning it off, setting it up again, making new backup codes and reading
 * the authenticator's secret need a session that passed it: the password alone (which a reset from
 * the mailbox gives) is not enough.
 *
 * Every other session is `false`, a session made by `createSession` included. The marker is written
 * right after the session exists and before the response leaves, so no client holds a token for a
 * session that is not marked yet. A write that fails fails the request: an unmarked session only
 * ever means a refusal later.
 */
import {
  APIError,
  createAuthMiddleware,
  getAuthoritativeSessionFromCtx,
  getSessionFromCtx,
} from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../constants';
import { isPlain } from '../../../utils/is-plain';
import type settingsService from '../../../services/settings';
import { clearAttempts, enrollmentKey, releaseAttempt, reserveAttempt } from '../lockout-counter';

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

interface SessionRef {
  session: { id: string; twoFactorVerified?: unknown };
  user: { id: string; twoFactorEnabled?: unknown; emailVerified?: unknown };
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

/** The emailed code, which a user with an authenticator cannot answer the challenge with */
const OTP_PATHS = new Set(['/two-factor/send-otp', '/two-factor/verify-otp']);

/** The two-factor plugin's challenge cookie */
const TWO_FACTOR_COOKIE = 'two_factor';

export const AUTHENTICATOR_REQUIRED_MESSAGE =
  'Use your authenticator app or a backup code: the emailed code is not available for your account.';

/** What changes a user's second factor, and so needs a session that passed it while it is on */
const SECOND_FACTOR_CHANGE_PATHS = new Set([
  '/two-factor/disable',
  '/two-factor/enable',
  '/two-factor/generate-backup-codes',
]);

/**
 * Hands out the authenticator's secret for the password alone: whoever holds it can make the codes,
 * so it is the second factor itself, and needs a session that passed it while it is on
 */
const TOTP_URI_PATH = '/two-factor/get-totp-uri';

export const CHANGE_NEEDS_SECOND_FACTOR_MESSAGE =
  'Sign in again with your second factor before you change it.';

export const SECRET_NEEDS_SECOND_FACTOR_MESSAGE =
  'Sign in again with your second factor before you set up another authenticator.';

/**
 * Moves the account to another address. Only a user whose current address is confirmed has it
 * approved from that mailbox first; for anyone else the proof goes to the new address alone, and a
 * stolen session could take the account with it. It is also guarded like the second factor itself.
 */
const CHANGE_EMAIL_PATH = '/change-email';

export const CHANGE_EMAIL_NEEDS_VERIFIED_MESSAGE =
  'Confirm your current email address before you change it: follow the link we sent you, or ask for a new one.';

export const CHANGE_EMAIL_NEEDS_SECOND_FACTOR_MESSAGE =
  'Sign in again with your second factor before you change your email address.';

/** The sessions Better Auth lists for the caller, one per device */
const LIST_SESSIONS_PATH = '/list-sessions';

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

export const ENROLLMENT_LOCKED_MESSAGE =
  'Too many wrong codes. Try again later, or start the setup again.';

/** Better Auth's answer to a code that is wrong */
const WRONG_CODE = 'INVALID_CODE';

const settings = (strapi: Core.Strapi) =>
  strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>;

/** The attempt counted for a request that confirms an enrollment, from its before-hook to its after-hook. */
const enrollmentAttempts = new WeakMap<object, string>();

/** The authenticator data's flags: the bit worth 4 says the authenticator verified the user */
const USER_VERIFIED_WEIGHT = 4;
/** The flags come after the 32 bytes of the relying party id hash */
const FLAGS_OFFSET = 32;

/**
 * Whether the authenticator verified the user in this passkey sign-in, as the browser's response
 * reports it. The plugin verifies the signature over this very data before the session exists, and
 * asks for no more than that (it never requires user verification), so the flag is read here.
 * Anything that does not parse as authenticator data is not verified.
 */
const userVerified = (ctx: HookContext): boolean => {
  const { body } = ctx as { body?: unknown };
  const outer = isPlain(body) ? body.response : undefined;
  const inner = isPlain(outer) ? outer.response : undefined;
  const data = isPlain(inner) ? inner.authenticatorData : undefined;

  if (typeof data !== 'string') {
    return false;
  }

  const bytes = Buffer.from(data, 'base64url');

  return (
    bytes.length > FLAGS_OFFSET && Math.floor(bytes[FLAGS_OFFSET] / USER_VERIFIED_WEIGHT) % 2 === 1
  );
};

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
    // password-protected setup produced, and it replaces the caller's session with a new one. A
    // session that is due a refresh is reported as created too, with the id it already had: that
    // one only proved the caller has a session. An emailed code that turns two-factor on has no
    // second factor behind it, and a backup code makes no session.
    return path === TOTP_VERIFY_PATH && created.session.id !== callerSession(ctx)?.session.id
      ? created
      : null;
  }

  if (path === PASSKEY_SIGN_IN_PATH) {
    return userVerified(ctx) ? createdSession(ctx) : null;
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

export const secondFactor = (strapi: Core.Strapi): BetterAuthPlugin => ({
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
        // Confirming an enrollment from a session: whoever holds one factor can try the other
        matcher: (context) => context.path === TOTP_VERIFY_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const current = (await getAuthoritativeSessionFromCtx(ctx)) as SessionRef | null;

          // The challenge after a sign-in has no session (the sign-in lock counts it), and a user
          // with two-factor on who gives a code again is not enrolling
          if (!current || current.user.twoFactorEnabled === true) {
            return;
          }

          const { lockout: options } = await settings(strapi).get();

          if (!options.enabled) {
            return;
          }

          const key = enrollmentKey(current.user.id);

          if ((await reserveAttempt(strapi, key, options)) > options.maxAttempts) {
            throw new APIError('TOO_MANY_REQUESTS', {
              code: 'TWO_FACTOR_ENROLLMENT_LOCKED',
              message: ENROLLMENT_LOCKED_MESSAGE,
            });
          }

          enrollmentAttempts.set(ctx.context, key);
        }),
      },
      {
        // The emailed code at the challenge, for a user who confirmed an authenticator
        matcher: (context) => OTP_PATHS.has(context.path as string),
        handler: createAuthMiddleware(async (ctx) => {
          // A request with a session is not the challenge: it is a signed-in user setting up
          // two-factor, and the mark never comes from it
          if (await getSessionFromCtx(ctx).catch(() => null)) {
            return;
          }

          const cookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE);
          const challenge = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
          const pending = challenge
            ? await ctx.context.internalAdapter.findVerificationValue(challenge)
            : null;

          // No challenge: Better Auth refuses the request itself
          if (!pending?.value) {
            return;
          }

          const row = (await ctx.context.adapter.findOne({
            model: 'twoFactor',
            where: [{ field: 'userId', value: pending.value }],
          })) as { verified?: boolean | null } | null;

          if (row?.verified === true) {
            throw new APIError('FORBIDDEN', {
              code: 'TWO_FACTOR_REQUIRED',
              message: AUTHENTICATOR_REQUIRED_MESSAGE,
            });
          }
        }),
      },
      {
        // Changing the second factor while it is on, or reading its secret, from a session that
        // never passed it
        matcher: (context) =>
          SECOND_FACTOR_CHANGE_PATHS.has(context.path as string) || context.path === TOTP_URI_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const current = (await getAuthoritativeSessionFromCtx(ctx)) as SessionRef | null;

          // Better Auth refuses a request with no session itself, and a user who has not turned
          // two-factor on is setting it up
          if (!current || current.user.twoFactorEnabled !== true) {
            return;
          }

          if (current.session.twoFactorVerified !== true) {
            throw new APIError('FORBIDDEN', {
              code: 'TWO_FACTOR_REQUIRED',
              message:
                ctx.path === TOTP_URI_PATH
                  ? SECRET_NEEDS_SECOND_FACTOR_MESSAGE
                  : CHANGE_NEEDS_SECOND_FACTOR_MESSAGE,
            });
          }
        }),
      },
      {
        // Changing the address from a session that proves less than the mailbox does
        matcher: (context) => context.path === CHANGE_EMAIL_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const current = (await getAuthoritativeSessionFromCtx(ctx)) as SessionRef | null;

          // Better Auth refuses a request with no session itself
          if (!current) {
            return;
          }

          if (current.user.emailVerified !== true) {
            throw new APIError('FORBIDDEN', {
              code: 'CURRENT_EMAIL_NOT_VERIFIED',
              message: CHANGE_EMAIL_NEEDS_VERIFIED_MESSAGE,
            });
          }

          if (
            current.user.twoFactorEnabled === true &&
            current.session.twoFactorVerified !== true
          ) {
            throw new APIError('FORBIDDEN', {
              code: 'TWO_FACTOR_REQUIRED',
              message: CHANGE_EMAIL_NEEDS_SECOND_FACTOR_MESSAGE,
            });
          }
        }),
      },
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
      {
        // A session's token is the credential of that session: the list names each session by its
        // id and device, and a stolen token does not give out the others
        matcher: (context) => context.path === LIST_SESSIONS_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const { returned } = ctx.context;

          if (!Array.isArray(returned)) {
            return;
          }

          return ctx.json(
            returned.map((session: Record<string, unknown>) =>
              Object.fromEntries(Object.entries(session).filter(([field]) => field !== 'token'))
            )
          );
        }),
      },
      {
        matcher: (context) => context.path === TOTP_VERIFY_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const key = enrollmentAttempts.get(ctx.context);

          if (!key) {
            return;
          }

          enrollmentAttempts.delete(ctx.context);

          const { returned } = ctx.context;

          if (!(returned instanceof APIError)) {
            await clearAttempts(strapi, key);
          } else if (returned.body?.code !== WRONG_CODE) {
            // Not a guess (no authenticator was set up): the attempt does not count
            await releaseAttempt(strapi, key);
          }
        }),
      },
    ],
  },
});
