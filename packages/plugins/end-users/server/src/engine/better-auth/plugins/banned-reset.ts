/**
 * `banned-reset`: a banned user can't reset their password.
 *
 * Better Auth's reset changes the password and leaves the ban to the sign-in that follows, so a
 * banned user who redeemed a reset link got a new password and no session, and an administrator who
 * lifted the ban later found a password they had not chosen. Here:
 *
 * - the redeem (`POST /reset-password`) is refused before anything changes, the token included,
 *   with the answer Better Auth's own ban check gives the native sign-in: 403 `BANNED_USER`. The
 *   Users & Permissions reset goes through this endpoint too, and its route turns the code into the
 *   400 that plugin gave a blocked user;
 * - no reset link is mailed to a banned user (`withoutBannedRecipients`). The request is answered
 *   as for any address, so the ban is not told to whoever asks.
 *
 * A ban that has run out is no ban. The resets of the opt-in sign-in plugins (email OTP, phone
 * number) are theirs.
 */
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

import { banState } from '../../../utils/ban';
import { isPlain } from '../../../utils/is-plain';
import { RESET_PASSWORD_IDENTIFIER } from '../reset-identifier';

/** What Better Auth's `admin` plugin answers a banned user's sign-in with, by default */
export const BANNED_MESSAGE =
  'You have been banned from this application. Please contact support if you believe this is an error.';

const RESET_PASSWORD_PATH = '/reset-password';

type Plain = Record<string, unknown>;

const tokenOf = (ctx: { body?: unknown; query?: unknown }): string | undefined => {
  const fromBody = isPlain(ctx.body) ? ctx.body.token : undefined;
  const fromQuery = isPlain(ctx.query) ? ctx.query.token : undefined;
  const token = fromBody || fromQuery;

  return typeof token === 'string' && token !== '' ? token : undefined;
};

type ResetSender = (input: { user: Plain } & Plain, request?: unknown) => unknown;

/**
 * The reset sender, sending nothing to a banned user. Wraps the sender in use, the plugin's own or
 * the project's, so neither mails a link that would only be refused.
 */
export const withoutBannedRecipients =
  (send: ResetSender): ResetSender =>
  async (input, request) => {
    if (banState(input.user ?? {}) === 'active') {
      return undefined;
    }

    return send(input, request);
  };

export const bannedReset = (): BetterAuthPlugin => ({
  id: 'banned-reset',

  hooks: {
    before: [
      {
        matcher: (context) => context.path === RESET_PASSWORD_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const token = tokenOf(ctx);

          // No token, or one that is not a reset's: Better Auth refuses it as it does
          if (!token) {
            return;
          }

          const verification = await ctx.context.internalAdapter.findVerificationValue(
            `${RESET_PASSWORD_IDENTIFIER}${token}`
          );
          const user = verification?.value
            ? ((await ctx.context.internalAdapter.findUserById(verification.value)) as Plain | null)
            : null;

          if (user && banState(user) === 'active') {
            throw new APIError('FORBIDDEN', { code: 'BANNED_USER', message: BANNED_MESSAGE });
          }
        }),
      },
    ],
  },
});
