import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { TWO_FACTOR_UID } from '../../../constants';
import { stepOfCode, totpReplay } from '../plugins/totp-replay';

vi.mock('better-auth/crypto', () => ({
  // The stored secret is the plain one here: decryption is Better Auth's
  symmetricDecrypt: vi.fn(async ({ data }: { data: string }) => data),
}));

vi.mock('better-auth/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSessionFromCtx: vi.fn(async (ctx: { session?: unknown }) => ctx.session ?? null),
}));

// Built at run time: no secret-shaped literal in the source
const SECRET = ['a', 'shared', 'totp', 'secret'].join('-');
const ENGINE_SECRET = ['engine', 'secret'].join('-');
const PERIOD_MS = 30_000;
// The middle of a period, so that no step moves while a test runs
const NOW = 1_800_000_000_000 - (1_800_000_000_000 % PERIOD_MS) + PERIOD_MS / 2;
const STEP = NOW / PERIOD_MS - 0.5;
const CHALLENGE_COOKIE = encodeURIComponent(
  `challenge-id.${createHmac('sha256', ENGINE_SECRET).update('challenge-id').digest('base64')}`
);

/** RFC 6238 with HMAC-SHA1 and 6 digits, as an authenticator computes it */
/* eslint-disable no-bitwise -- the dynamic truncation of RFC 4226 is defined on bits */
const codeAt = (step: number) => {
  const counter = Buffer.alloc(8);

  counter.writeBigUInt64BE(BigInt(step));

  const digest = createHmac('sha1', SECRET).update(counter).digest();
  const offset = digest[digest.length - 1] & 0xf;

  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
};
/* eslint-enable no-bitwise */

describe('stepOfCode', () => {
  it('finds the step of a code of this period, or of the one on either side', async () => {
    for (const offset of [-1, 0, 1]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(stepOfCode(SECRET, codeAt(STEP + offset), {}, NOW)).resolves.toBe(STEP + offset);
    }
  });

  it('answers null for a code of no step Better Auth accepts', async () => {
    await expect(stepOfCode(SECRET, codeAt(STEP - 2), {}, NOW)).resolves.toBeNull();
    await expect(stepOfCode(SECRET, '000000', {}, NOW)).resolves.toBeNull();
    await expect(stepOfCode(SECRET, '12345', {}, NOW)).resolves.toBeNull();
  });
});

describe('totp-replay', () => {
  /**
   * The before hook on `verify-totp`, for a user signing in through a challenge (or with a
   * session), whose two-factor row is `row`, and `claimed` rows for the conditional update
   */
  const setup = ({
    row = { secret: SECRET, verified: true, lockedUntil: null } as Record<string, unknown> | null,
    claimed = 1,
    session = null as unknown,
  } = {}) => {
    const updateMany = vi.fn(async () => ({ count: claimed }));
    const strapi = { db: { query: vi.fn(() => ({ updateMany })) } } as unknown as Core.Strapi;
    const plugin = totpReplay(strapi);
    const [hook] = plugin.hooks!.before!;
    const context = {
      createAuthCookie: () => ({ name: 'strapi.two_factor' }),
      secret: ENGINE_SECRET,
      secretConfig: ENGINE_SECRET,
      getPlugin: () => ({ options: {} }),
      internalAdapter: { findVerificationValue: vi.fn(async () => ({ value: 'user-1' })) },
      adapter: { findOne: vi.fn(async () => row) },
    };
    const run = (code: unknown) =>
      (hook.handler as unknown as (ctx: unknown) => Promise<unknown>)({
        path: '/two-factor/verify-totp',
        body: { code },
        session,
        // The challenge cookie, signed as Better Auth signs it
        headers: new Headers({ cookie: `strapi.two_factor=${CHALLENGE_COOKIE}` }),
        context,
      });

    return { plugin, hook, run, strapi, updateMany };
  };

  it('keeps the step on the two-factor row, private and never returned', () => {
    const { plugin, hook } = setup();

    expect(plugin.schema).toEqual({
      twoFactor: {
        fields: {
          lastTotpStep: { type: 'number', required: false, input: false, returned: false },
        },
      },
    });
    expect(hook.matcher({ path: '/two-factor/verify-totp' } as never)).toBe(true);
    expect(hook.matcher({ path: '/two-factor/verify-backup-code' } as never)).toBe(false);
  });

  it('claims the step of a good code, only if no later or equal step was taken', async () => {
    vi.useFakeTimers({ now: NOW });

    try {
      const { run, strapi, updateMany } = setup();

      await expect(run(codeAt(STEP - 1))).resolves.toBeUndefined();
      expect(strapi.db.query).toHaveBeenCalledWith(TWO_FACTOR_UID);
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          $or: [{ lastTotpStep: null }, { lastTotpStep: { $lt: STEP - 1 } }],
        },
        data: { lastTotpStep: STEP - 1 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses a code whose step was taken, as a wrong code is refused', async () => {
    vi.useFakeTimers({ now: NOW });

    try {
      const { run } = setup({ claimed: 0 });

      await expect(run(codeAt(STEP))).rejects.toMatchObject({
        statusCode: 401,
        body: { code: 'INVALID_CODE', message: 'Invalid code' },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('claims nothing for a code Better Auth refuses anyway', async () => {
    vi.useFakeTimers({ now: NOW });

    try {
      const locked = { secret: SECRET, verified: true, lockedUntil: new Date(NOW + 60_000) };
      const unconfirmed = { secret: SECRET, verified: false, lockedUntil: null };

      for (const [state, code] of [
        [{}, '000000'],
        [{}, codeAt(STEP - 2)],
        [{}, undefined],
        [{ row: null }, codeAt(STEP)],
        [{ row: locked }, codeAt(STEP)],
        [{ row: unconfirmed }, codeAt(STEP)],
      ] as const) {
        const { run, updateMany } = setup(state as never);

        // eslint-disable-next-line no-await-in-loop
        await expect(run(code)).resolves.toBeUndefined();
        expect(updateMany).not.toHaveBeenCalled();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('claims the step for a signed-in user confirming the authenticator, as Better Auth checks no lock there', async () => {
    vi.useFakeTimers({ now: NOW });

    try {
      const { run, updateMany } = setup({
        row: { secret: SECRET, verified: false, lockedUntil: new Date(NOW + 60_000) },
        session: { user: { id: 'user-1' }, session: { id: 's1' } },
      });

      await run(codeAt(STEP));

      expect(updateMany).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
