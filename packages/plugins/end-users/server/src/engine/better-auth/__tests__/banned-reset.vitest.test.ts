import { describe, expect, it, vi } from 'vitest';

import {
  BANNED_MESSAGE,
  bannedReset,
  withoutBannedOtpRecipients,
  withoutBannedPhoneRecipients,
  withoutBannedRecipients,
} from '../plugins/banned-reset';

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

  describe('the resets of the email OTP and phone number plugins', () => {
    const BANNED = { ...ACTIVE_USER, banned: true };

    /** The before hook, with the user a lookup by address or by phone number finds */
    const otpSetup = (user: Record<string, unknown> | null) => {
      const [, hook] = bannedReset().hooks!.before!;
      const findUserByEmail = vi.fn(async (email: string) =>
        user && email === 'user@example.com' ? { user, accounts: [] } : null
      );
      const findOne = vi.fn(
        async ({ where }: { where: Array<{ field: string; value: string }> }) =>
          user && where[0].field === 'phoneNumber' && where[0].value === '+15550100' ? user : null
      );
      const run = (path: string, body: Record<string, unknown>) =>
        (hook.handler as unknown as (ctx: unknown) => Promise<unknown>)({
          path,
          body,
          context: { internalAdapter: { findUserByEmail }, adapter: { findOne } },
        });

      return { hook, run, findUserByEmail, findOne };
    };

    it('runs on both redeems', () => {
      const { hook } = otpSetup(null);

      expect(hook.matcher({ path: '/email-otp/reset-password' } as never)).toBe(true);
      expect(hook.matcher({ path: '/phone-number/reset-password' } as never)).toBe(true);
      expect(hook.matcher({ path: '/email-otp/request-password-reset' } as never)).toBe(false);
    });

    it('refuses the email OTP redeem of a banned user, whatever the capitals of the address', async () => {
      const { run } = otpSetup(BANNED);

      await expect(
        run('/email-otp/reset-password', {
          email: 'User@Example.com',
          otp: '123456',
          password: 'x',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        body: { code: 'BANNED_USER', message: BANNED_MESSAGE },
      });
    });

    it('refuses the phone number redeem of a banned user', async () => {
      const { run } = otpSetup(BANNED);

      await expect(
        run('/phone-number/reset-password', {
          phoneNumber: '+15550100',
          otp: '1',
          newPassword: 'x',
        })
      ).rejects.toMatchObject({ statusCode: 403, body: { code: 'BANNED_USER' } });
    });

    it('lets a user who is not banned, an unknown address and a body without one through', async () => {
      await expect(
        otpSetup(ACTIVE_USER).run('/email-otp/reset-password', { email: 'user@example.com' })
      ).resolves.toBeUndefined();
      await expect(
        otpSetup({ ...BANNED, banExpires: new Date(Date.now() - 1000) }).run(
          '/phone-number/reset-password',
          { phoneNumber: '+15550100' }
        )
      ).resolves.toBeUndefined();
      await expect(
        otpSetup(BANNED).run('/email-otp/reset-password', { email: 'other@example.com' })
      ).resolves.toBeUndefined();

      const none = otpSetup(BANNED);

      await expect(none.run('/email-otp/reset-password', {})).resolves.toBeUndefined();
      await expect(none.run('/phone-number/reset-password', { phoneNumber: 1 })).resolves.toBe(
        undefined
      );
      expect(none.findUserByEmail).not.toHaveBeenCalled();
      expect(none.findOne).not.toHaveBeenCalled();
    });

    /** The sender's second argument: the endpoint context Better Auth passes it */
    const sendContext = (user: Record<string, unknown> | null) => ({
      context: {
        internalAdapter: { findUserByEmail: vi.fn(async () => (user ? { user } : null)) },
        adapter: { findOne: vi.fn(async () => user) },
      },
    });

    it('mails no reset code to a banned address, and everything else as before', async () => {
      const send = vi.fn(async () => 'sent');
      const sender = withoutBannedOtpRecipients(send);
      const reset = { email: 'user@example.com', otp: '123456', type: 'forget-password' as const };

      await expect(sender(reset, sendContext(BANNED) as never)).resolves.toBeUndefined();
      expect(send).not.toHaveBeenCalled();

      await expect(sender(reset, sendContext(ACTIVE_USER) as never)).resolves.toBe('sent');
      // Codes that are not a password reset's are not this hook's: the ban is the sign-in's to refuse
      const signIn = { ...reset, type: 'sign-in' as const };
      const banned = sendContext(BANNED);

      await expect(sender(signIn, banned as never)).resolves.toBe('sent');
      expect(banned.context.internalAdapter.findUserByEmail).not.toHaveBeenCalled();
    });

    it('mails no reset code to a banned phone number', async () => {
      const send = vi.fn(async () => 'sent');
      const sender = withoutBannedPhoneRecipients(send);
      const reset = { phoneNumber: '+15550100', code: '123456' };

      await expect(sender(reset, sendContext(BANNED) as never)).resolves.toBeUndefined();
      expect(send).not.toHaveBeenCalled();
      await expect(sender(reset, sendContext(ACTIVE_USER) as never)).resolves.toBe('sent');
      await expect(sender(reset, sendContext(null) as never)).resolves.toBe('sent');
    });
  });
});
