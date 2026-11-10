import { describe, expect, it, vi } from 'vitest';

import { BANNED_MESSAGE, bannedReset, withoutBannedRecipients } from '../plugins/banned-reset';

const ACTIVE_USER = { id: 'u1', email: 'user@example.com', banned: false, banExpires: null };

/** The before hook on `/reset-password`, and what it reads: the token's record and its user */
const setup = (user: Record<string, unknown> | null, token = 'reset-token') => {
  const [hook] = bannedReset().hooks!.before!;
  const internalAdapter = {
    findVerificationValue: vi.fn(async (identifier: string) =>
      identifier === `reset-password:${token}` ? { value: 'u1' } : null
    ),
    findUserById: vi.fn(async (id: string) => (id === 'u1' ? user : null)),
  };
  const run = (body: Record<string, unknown>, query?: Record<string, unknown>) =>
    (hook.handler as unknown as (ctx: unknown) => Promise<unknown>)({
      path: '/reset-password',
      body,
      query,
      context: { internalAdapter },
    });

  return { hook, run, internalAdapter };
};

describe('banned-reset', () => {
  it('runs on the reset redeem only', () => {
    const { hook } = setup(ACTIVE_USER);

    expect(hook.matcher({ path: '/reset-password' } as never)).toBe(true);
    expect(hook.matcher({ path: '/request-password-reset' } as never)).toBe(false);
    expect(hook.matcher({ path: '/reset-password/:token' } as never)).toBe(false);
  });

  it('refuses the redeem of a banned user with the native sign-in`s ban answer', async () => {
    const { run } = setup({ ...ACTIVE_USER, banned: true });

    await expect(run({ token: 'reset-token', newPassword: 'x' })).rejects.toMatchObject({
      statusCode: 403,
      body: { code: 'BANNED_USER', message: BANNED_MESSAGE },
    });
    // The token may come in the query too
    await expect(run({ newPassword: 'x' }, { token: 'reset-token' })).rejects.toMatchObject({
      body: { code: 'BANNED_USER' },
    });
  });

  it('lets a user who is not banned, or whose ban has run out, through', async () => {
    await expect(setup(ACTIVE_USER).run({ token: 'reset-token' })).resolves.toBeUndefined();
    await expect(
      setup({ ...ACTIVE_USER, banned: true, banExpires: new Date(Date.now() - 1000) }).run({
        token: 'reset-token',
      })
    ).resolves.toBeUndefined();
  });

  it('leaves a missing or unknown token to Better Auth, which refuses it', async () => {
    const { run, internalAdapter } = setup({ ...ACTIVE_USER, banned: true });

    await expect(run({ newPassword: 'x' })).resolves.toBeUndefined();
    expect(internalAdapter.findVerificationValue).not.toHaveBeenCalled();
    await expect(run({ token: 'other-token' })).resolves.toBeUndefined();
    expect(internalAdapter.findUserById).not.toHaveBeenCalled();
  });

  it('mails no reset link to a banned user, and the others as before', async () => {
    const send = vi.fn(async () => 'sent');
    const sender = withoutBannedRecipients(send);

    await expect(sender({ user: { ...ACTIVE_USER, banned: true }, url: 'u' })).resolves.toBe(
      undefined
    );
    expect(send).not.toHaveBeenCalled();

    const input = { user: ACTIVE_USER, url: 'u', token: 't' };

    await expect(sender(input, 'request')).resolves.toBe('sent');
    expect(send).toHaveBeenCalledWith(input, 'request');
  });
});
