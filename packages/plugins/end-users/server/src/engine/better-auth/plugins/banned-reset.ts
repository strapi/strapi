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
 *   400 that plugin gave a blocked user. So are the redeems of the email OTP and phone number
 *   plugins (`/email-otp/reset-password`, `/phone-number/reset-password`), which the project opts
 *   into and which change the password on a code alone;
 * - no reset link or code is sent to a banned user (`withoutBannedRecipients`,
 *   `withoutBannedOtpRecipients`, `withoutBannedPhoneRecipients`). The request is answered as for
 *   any address, so the ban is not told to whoever asks.
 *
 * A ban that has run out is no ban.
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
const EMAIL_OTP_RESET_PATH = '/email-otp/reset-password';
const PHONE_NUMBER_RESET_PATH = '/phone-number/reset-password';

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

type OtpSender = (
  input: { email: string; otp: string; type: string },
  ctx?: { context?: AuthContext } | null
) => unknown;

type PhoneSender = (
  input: { phoneNumber: string; code: string },
  ctx?: { context?: AuthContext } | null
) => unknown;

interface AuthContext {
  internalAdapter: { findUserByEmail(email: string): Promise<{ user: Plain } | null> };
  adapter: { findOne(query: unknown): Promise<unknown> };
}

const userByEmail = async (context: AuthContext, email: string) =>
  (await context.internalAdapter.findUserByEmail(email.toLowerCase()))?.user ?? null;

const userByPhoneNumber = async (context: AuthContext, phoneNumber: string) =>
  (await context.adapter.findOne({
    model: 'user',
    where: [{ field: 'phoneNumber', value: phoneNumber }],
  })) as Plain | null;

/**
 * The email OTP sender, sending no password reset code to a banned user. Codes for anything else
 * (a sign-in, a verification) go as before: the ban is refused where they are redeemed.
 */
export const withoutBannedOtpRecipients =
  (send: OtpSender): OtpSender =>
  async (input, ctx) => {
    if (input.type === 'forget-password' && ctx?.context) {
      const user = await userByEmail(ctx.context, input.email);

      if (user && banState(user) === 'active') {
        return undefined;
      }
    }

    return send(input, ctx);
  };

/** The phone number plugin's reset code sender, sending nothing to a banned user */
export const withoutBannedPhoneRecipients =
  (send: PhoneSender): PhoneSender =>
  async (input, ctx) => {
    if (ctx?.context) {
      const user = await userByPhoneNumber(ctx.context, input.phoneNumber);

      if (user && banState(user) === 'active') {
        return undefined;
      }
    }

    return send(input, ctx);
  };

const REFUSED = { code: 'BANNED_USER', message: BANNED_MESSAGE };

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
            throw new APIError('FORBIDDEN', REFUSED);
          }
        }),
      },
      {
        matcher: (context) =>
          context.path === EMAIL_OTP_RESET_PATH || context.path === PHONE_NUMBER_RESET_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const body = isPlain(ctx.body) ? ctx.body : {};
          const context = ctx.context as unknown as AuthContext;
          const { email, phoneNumber } = body;
          let user: Plain | null = null;

          if (ctx.path === EMAIL_OTP_RESET_PATH && typeof email === 'string') {
            user = await userByEmail(context, email);
          } else if (ctx.path === PHONE_NUMBER_RESET_PATH && typeof phoneNumber === 'string') {
            user = await userByPhoneNumber(context, phoneNumber);
          }

          if (user && banState(user) === 'active') {
            throw new APIError('FORBIDDEN', REFUSED);
          }
        }),
      },
    ],
  },
});
