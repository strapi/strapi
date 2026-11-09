/**
 * `lockout`: repeated failed password sign-ins lock the sign-in.
 *
 * On by default: after `maxAttempts` (5) failures the sign-in is locked for `durationMinutes` (15).
 * The three numbers are the admin settings (`service('settings').get().lockout`), read on every
 * request.
 *
 *  - Every identifier has a counter, whether or not an account exists for it (`lockout-counter.ts`:
 *    one atomic upsert in the rate-limit table, keyed by a hash of the normalized address or
 *    username). An unknown address locks after the same number of attempts as a real one and gets
 *    the same answer, so the lock is not a way to find out who has an account. A username that
 *    belongs to an account is counted on that account's address, so the two ways in share one count.
 *  - The attempt is counted in the before-hook, before the password is checked, so parallel guesses
 *    cannot all read the same count. The first `maxAttempts` attempts get Better Auth's own answer
 *    (a wrong password is 401); the next one gets 403 `ACCOUNT_LOCKED`, whatever the password,
 *    with no unlock time in the body, so a locked account is not a password oracle.
 *  - A success deletes the counter. An answer that is not a wrong password (an unverified address, a
 *    ban) is not a guess, and takes the attempt back. A password reset and `engine.unlock` delete the
 *    counter too.
 *  - For an account the state is mirrored into `failedSignIns` and `lockedUntil` on the user, so the
 *    Security panel and Unlock keep working. They are shown in the Content Manager, and are
 *    `input: false` and `returned: false`: neither a request nor a response carries them.
 */
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../constants';
import type settingsService from '../../../services/settings';
import { normalizeEmail } from '../../../utils/normalize-email';
import { normalizeUsername } from '../../../utils/normalize-username';
import { RESET_PASSWORD_IDENTIFIER } from '../reset-identifier';
import { clearAttempts, lockoutKey, releaseAttempt, reserveAttempt } from '../lockout-counter';

const SIGN_IN_PATHS = new Set<string>(['/sign-in/email', '/sign-in/username']);
const RESET_PASSWORD_PATH = '/reset-password';

/** The two answers Better Auth gives to a wrong password (the email one and the username one). */
const WRONG_PASSWORD_CODES = new Set<string>([
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_USERNAME_OR_PASSWORD',
]);

export const ACCOUNT_LOCKED_MESSAGE = 'This account is locked. Try again later.';

const MINUTE = 60_000;

const settings = (strapi: Core.Strapi) =>
  strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>;

interface LockoutUser {
  id: string;
  email: string;
  failedSignIns?: number | null;
  lockedUntil?: Date | string | null;
}

interface LockoutContext {
  body?: unknown;
  path?: string;
  context: {
    adapter: {
      findOne: <T>(query: {
        model: string;
        where: Array<{ field: string; value: string }>;
      }) => Promise<T | null>;
    };
    internalAdapter: {
      findUserByEmail: (email: string) => Promise<{ user: LockoutUser } | null>;
      findUserById: (id: string) => Promise<LockoutUser | null>;
      updateUser: (id: string, data: Record<string, unknown>) => Promise<unknown>;
      findVerificationValue: (identifier: string) => Promise<{ value: string } | null>;
    };
    returned?: unknown;
  };
}

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The user a password sign-in names, by its address or its username (both are stored lowercase). */
const findUser = async (ctx: LockoutContext, identifier: string): Promise<LockoutUser | null> =>
  ctx.path === '/sign-in/username'
    ? ctx.context.adapter.findOne<LockoutUser>({
        model: 'user',
        where: [{ field: 'username', value: identifier }],
      })
    : ((await ctx.context.internalAdapter.findUserByEmail(identifier))?.user ?? null);

/** What the sign-in names, normalized the way the plugin stores it; null when the body names nothing. */
const identifierOf = (ctx: LockoutContext): string | null => {
  const { body } = ctx;

  if (!isPlain(body)) {
    return null;
  }

  const value = ctx.path === '/sign-in/username' ? body.username : body.email;

  if (typeof value !== 'string' || value === '') {
    return null;
  }

  return ctx.path === '/sign-in/username' ? normalizeUsername(value) : normalizeEmail(value);
};

/** The counter of the sign-in in flight, from its before-hook to its after-hook. */
interface Reservation {
  key: string;
  count: number;
  userId: string | null;
  /** The user row holds a count or a lock to clear: each write there is an `entry.update`. */
  mirrored: boolean;
}

const reservations = new WeakMap<object, Reservation>();

const CLEARED = { failedSignIns: 0, lockedUntil: null };

/** The user a reset-password request is for, from the token, read before the reset consumes it. */
const resetTargets = new WeakMap<object, string>();

const tokenOf = (ctx: LockoutContext & { query?: unknown }): string | undefined => {
  const fromBody = isPlain(ctx.body) ? ctx.body.token : undefined;
  const fromQuery = isPlain(ctx.query) ? ctx.query.token : undefined;
  const token = fromBody || fromQuery;

  return typeof token === 'string' && token !== '' ? token : undefined;
};

/** The counter of an account: its address, however it signs in. */
export const keyOfAccount = (email: string): string => lockoutKey(normalizeEmail(email));

export const lockout = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'lockout',

  schema: {
    user: {
      fields: {
        failedSignIns: {
          type: 'number',
          required: false,
          defaultValue: 0,
          input: false,
          returned: false,
        },
        lockedUntil: { type: 'date', required: false, input: false, returned: false },
      },
    },
  },

  hooks: {
    before: [
      {
        matcher: (context) => Boolean(context.path && SIGN_IN_PATHS.has(context.path)),
        handler: createAuthMiddleware(async (ctx) => {
          const { lockout: options } = await settings(strapi).get();

          if (!options.enabled) {
            return;
          }

          const lockoutCtx = ctx as unknown as LockoutContext;
          const identifier = identifierOf(lockoutCtx);

          // Nothing named: Better Auth refuses the body itself
          if (identifier === null) {
            return;
          }

          const user = await findUser(lockoutCtx, identifier);
          const key = user ? keyOfAccount(user.email) : lockoutKey(identifier);
          const count = await reserveAttempt(strapi, key, options);

          if (count > options.maxAttempts) {
            throw new APIError('FORBIDDEN', {
              code: 'ACCOUNT_LOCKED',
              message: ACCOUNT_LOCKED_MESSAGE,
            });
          }

          reservations.set(lockoutCtx.context, {
            key,
            count,
            userId: user?.id ?? null,
            mirrored: Boolean(user?.lockedUntil) || Number(user?.failedSignIns ?? 0) > 0,
          });
        }),
      },
      {
        matcher: (context) => context.path === RESET_PASSWORD_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const lockoutCtx = ctx as unknown as LockoutContext & { query?: unknown };
          const token = tokenOf(lockoutCtx);

          if (!token) {
            return;
          }

          const verification = await lockoutCtx.context.internalAdapter.findVerificationValue(
            `${RESET_PASSWORD_IDENTIFIER}${token}`
          );

          if (verification?.value) {
            resetTargets.set(lockoutCtx.context, verification.value);
          }
        }),
      },
    ],

    after: [
      {
        matcher: (context) => Boolean(context.path && SIGN_IN_PATHS.has(context.path)),
        handler: createAuthMiddleware(async (ctx) => {
          const lockoutCtx = ctx as unknown as LockoutContext;
          const reservation = reservations.get(lockoutCtx.context);

          // No attempt was counted: lockout is off, or this plugin refused the request itself
          if (!reservation) {
            return;
          }

          reservations.delete(lockoutCtx.context);

          const { lockout: options } = await settings(strapi).get();
          const { updateUser } = lockoutCtx.context.internalAdapter;
          const { returned } = lockoutCtx.context;
          const { key, count, userId, mirrored } = reservation;

          if (!(returned instanceof APIError)) {
            // The password was right
            await clearAttempts(strapi, key);

            // Every write to the user is an `entry.update`, so a first attempt that found nothing
            // to clear writes nothing
            if (userId && (mirrored || count > 1)) {
              await updateUser(userId, CLEARED);
            }

            return;
          }

          if (!WRONG_PASSWORD_CODES.has(String(returned.body?.code))) {
            // Not a guess (an unverified address, a ban): the attempt does not count
            await releaseAttempt(strapi, key);

            return;
          }

          if (userId) {
            await updateUser(
              userId,
              count >= options.maxAttempts
                ? {
                    failedSignIns: count,
                    lockedUntil: new Date(Date.now() + options.durationMinutes * MINUTE),
                  }
                : // A lock that has run out is over: this is a fresh count
                  { failedSignIns: count, lockedUntil: null }
            );
          }
        }),
      },
      {
        matcher: (context) => context.path === RESET_PASSWORD_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const lockoutCtx = ctx as unknown as LockoutContext;
          const userId = resetTargets.get(lockoutCtx.context);

          if (!userId || lockoutCtx.context.returned instanceof APIError) {
            return;
          }

          const { internalAdapter } = lockoutCtx.context;
          const user = await internalAdapter.findUserById(userId);

          if (user) {
            await clearAttempts(strapi, keyOfAccount(user.email));
          }

          await internalAdapter.updateUser(userId, CLEARED);
        }),
      },
    ],
  },
});
