/**
 * `totp-replay`: an authenticator code is taken once.
 *
 * Better Auth's two-factor plugin accepts any code of the current 30-second period or the one on
 * either side of it (`verify-totp`), and remembers none of them, so a code seen over a shoulder or
 * in a log signs in a second time inside its window. RFC 6238 (section 5.2) says a verifier should
 * not accept the second attempt of a valid code. So the time step of the last code taken is kept on
 * the user's two-factor row (`lastTotpStep`, private and never returned), and a code is taken only
 * from a later step. The previous period's code is still taken, for a clock a little behind, as long
 * as no later code has been.
 *
 * The step is claimed before Better Auth verifies, in one conditional update, so of two requests
 * with the same code one gets it. A code Better Auth would refuse anyway (a wrong one, a locked
 * second factor, an authenticator that was never confirmed) claims nothing. A refused code gets the
 * answer of a wrong one, 401 `INVALID_CODE`. Backup codes and emailed codes are single-use already.
 */
import { createOTP } from '@better-auth/utils/otp';
import { base32 } from '@better-auth/utils/base32';
import { timingSafeEqual } from 'node:crypto';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { symmetricDecrypt } from 'better-auth/crypto';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { TWO_FACTOR_UID } from '../../../constants';
import { isPlain } from '../../../utils/is-plain';

const VERIFY_TOTP_PATH = '/two-factor/verify-totp';

/** The two-factor plugin's challenge cookie, and the prefix it gives a base32 secret */
const TWO_FACTOR_COOKIE = 'two_factor';
const BASE32_PREFIX = 'base32:';

/** What Better Auth answers a wrong code with */
const INVALID_CODE = { code: 'INVALID_CODE', message: 'Invalid code' };

interface TwoFactorRow {
  secret?: string;
  verified?: boolean | null;
  lockedUntil?: Date | string | null;
}

interface TotpOptions {
  period?: number;
  digits?: number;
}

// Compared as bytes: a multibyte character makes two strings of one length differ in byte length,
// and `timingSafeEqual` throws on that, where a wrong code is to be refused like any other
const sameCode = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * The time step `code` belongs to, among the ones Better Auth accepts (this period and one on each
 * side), or `null` when it is none of them. The latest wins in the unlikely case of two.
 */
export const stepOfCode = async (
  secret: string | Uint8Array,
  code: string,
  { period = 30, digits = 6 }: TotpOptions = {},
  now = Date.now()
): Promise<number | null> => {
  const otp = createOTP(secret as string, { period, digits });
  const current = Math.floor(now / (period * 1000));

  for (const step of [current + 1, current, current - 1]) {
    // eslint-disable-next-line no-await-in-loop
    if (sameCode(code, await otp.hotp(step))) {
      return step;
    }
  }

  return null;
};

/** The secret Better Auth stores, as its own verification reads it */
const decryptSecret = async (key: unknown, data: string): Promise<string | Uint8Array> => {
  const secret = await symmetricDecrypt({ key: key as string, data });

  return secret.startsWith(BASE32_PREFIX)
    ? base32.decode(secret.slice(BASE32_PREFIX.length).toUpperCase())
    : secret;
};

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/**
 * The user the code is for, found as Better Auth's verification finds them: the session, else the
 * sign-in's challenge. `signIn` says it is the challenge, where Better Auth checks more.
 */
const userOf = async (ctx: HookContext): Promise<{ userId: string; signIn: boolean } | null> => {
  const session = await getSessionFromCtx(ctx).catch(() => null);

  if (session?.user?.id) {
    return { userId: session.user.id, signIn: false };
  }

  const cookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE);
  const challenge = await ctx.getSignedCookie(cookie.name, ctx.context.secret);

  if (!challenge) {
    return null;
  }

  const verification = await ctx.context.internalAdapter.findVerificationValue(challenge);

  return verification?.value ? { userId: verification.value, signIn: true } : null;
};

export const totpReplay = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'totp-replay',

  schema: {
    twoFactor: {
      fields: {
        lastTotpStep: { type: 'number', required: false, input: false, returned: false },
      },
    },
  },

  hooks: {
    before: [
      {
        matcher: (context) => context.path === VERIFY_TOTP_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const code = isPlain(ctx.body) ? ctx.body.code : undefined;

          if (typeof code !== 'string' || code === '') {
            return;
          }

          const caller = await userOf(ctx);
          const row = caller
            ? ((await ctx.context.adapter.findOne({
                model: 'twoFactor',
                where: [{ field: 'userId', value: caller.userId }],
              })) as TwoFactorRow | null)
            : null;

          // Refused by Better Auth whatever the code: nothing to claim. A sign-in is refused while
          // the second factor is locked or was never confirmed
          if (
            !caller ||
            !row?.secret ||
            (caller.signIn &&
              (row.verified === false ||
                (row.lockedUntil && new Date(row.lockedUntil).getTime() > Date.now())))
          ) {
            return;
          }

          const { userId } = caller;

          const options = (
            ctx.context.getPlugin('two-factor') as { options?: { totpOptions?: TotpOptions } }
          )?.options?.totpOptions;
          const step = await stepOfCode(
            await decryptSecret(ctx.context.secretConfig, row.secret),
            code,
            { period: options?.period || 30, digits: options?.digits || 6 }
          );

          // A wrong code: Better Auth counts it
          if (step === null) {
            return;
          }

          const { count } = (await strapi.db.query(TWO_FACTOR_UID).updateMany({
            where: {
              userId,
              $or: [{ lastTotpStep: null }, { lastTotpStep: { $lt: step } }],
            },
            data: { lastTotpStep: step },
          })) as { count: number };

          if (count !== 1) {
            throw new APIError('UNAUTHORIZED', INVALID_CODE);
          }
        }),
      },
    ],
  },
});
