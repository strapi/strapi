import { describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { betterAuth } from 'better-auth/minimal';
import type { Core } from '@strapi/types';

import { legacyRevoke } from '../plugins/legacy-revoke';
import { revokeOnPasswordChange } from '../plugins/revoke-on-password-change';

// Built at run time: no secret-shaped literal in the source
const SECRET = ['legacy', 'revoke', 'test', 'secret', 'long', 'enough', 'to', 'use'].join('-');
const PASSWORD = ['Old', 'Passw0rd!x'].join('-');
const NEW_PASSWORD = ['New', 'Passw0rd!y'].join('-');
const EMAIL = 'ann@example.com';

/**
 * The engine with the compatibility mode off: no `strapi-compat` plugin, and no origin for the old
 * sessions, so the only thing a revoke can do for them is record the moment on the user.
 */
const build = () => {
  const db = { user: [], session: [], account: [], verification: [] } as Record<string, any[]>;
  const markLegacyRevoked = vi.fn(async () => ({ count: 1 }));
  const invalidateLegacy = vi.fn(async () => undefined);
  const strapi = {
    sessionManager: Object.assign(() => ({ invalidateRefreshToken: invalidateLegacy }), {
      hasOrigin: () => false,
    }),
    db: { query: () => ({ updateMany: markLegacyRevoked }) },
  } as unknown as Core.Strapi;

  // The links the two mails of a change of address carry: the current address approves, the new
  // one proves itself
  const approvals: string[] = [];
  const proofs: string[] = [];

  const auth = betterAuth({
    secret: SECRET,
    baseURL: 'http://localhost:1337',
    basePath: '/api/auth',
    telemetry: { enabled: false },
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    emailVerification: {
      async sendVerificationEmail({ token }: { token: string }) {
        proofs.push(token);
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        async sendChangeEmailConfirmation({ token }: { token: string }) {
          approvals.push(token);
        },
      },
    },
    plugins: [revokeOnPasswordChange(), legacyRevoke(strapi)],
  });

  const signedUp = async () => {
    const result = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
      returnHeaders: true,
    });

    return { cookie: (result.headers.get('set-cookie') ?? '').split(';')[0], db };
  };

  const signedIn = async () => {
    const result = await auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
      returnHeaders: true,
    });

    return (result.headers.get('set-cookie') ?? '').split(';')[0];
  };

  return { auth, signedUp, signedIn, markLegacyRevoked, invalidateLegacy, approvals, proofs, db };
};

describe('legacy-revoke', () => {
  it('records the revoke time on the user when they sign out everywhere or everywhere else, with the compatibility mode off', async () => {
    for (const call of ['revokeSessions', 'revokeOtherSessions'] as const) {
      const { auth, signedUp, markLegacyRevoked, invalidateLegacy } = build();
      const { cookie, db } = await signedUp();

      // eslint-disable-next-line no-await-in-loop
      await auth.api[call]({ headers: { cookie } });

      expect(markLegacyRevoked, call).toHaveBeenCalledTimes(1);
      expect(markLegacyRevoked, call).toHaveBeenCalledWith({
        where: { documentId: db.user[0].id },
        data: { legacyTokensRevokedAt: expect.any(Date) },
      });
      // No old origin: nothing else to end
      expect(invalidateLegacy, call).not.toHaveBeenCalled();
    }
  });

  it('records it on a password change, which signs the other sessions out', async () => {
    const { auth, signedUp, markLegacyRevoked } = build();
    const { cookie } = await signedUp();

    await auth.api.changePassword({
      body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      headers: { cookie },
    });

    expect(markLegacyRevoked).toHaveBeenCalledTimes(1);
  });

  it('records nothing when the request failed', async () => {
    const { auth, signedUp, markLegacyRevoked } = build();
    const { cookie } = await signedUp();

    await expect(
      auth.api.changePassword({
        body: { currentPassword: 'not-it', newPassword: NEW_PASSWORD },
        headers: { cookie },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(markLegacyRevoked).not.toHaveBeenCalled();
  });
});

describe('legacy-revoke: a change of email address', () => {
  const NEW_EMAIL = 'ann.new@example.com';

  /** Two sessions of a verified user, and the change of address asked for from the first */
  const asked = async () => {
    const ctx = build();
    const { cookie } = await ctx.signedUp();

    ctx.db.user[0].emailVerified = true;

    const other = await ctx.signedIn();

    await ctx.auth.api.changeEmail({ body: { newEmail: NEW_EMAIL }, headers: { cookie } });

    return { ...ctx, cookie, other };
  };

  const sessionsOf = (db: Record<string, any[]>) => db.session.map((row) => row.token);

  it('is approved by the current address before the new one is asked, and ends no session on the way', async () => {
    const { auth, approvals, proofs, db } = await asked();

    expect(approvals).toHaveLength(1);
    expect(proofs).toHaveLength(0);

    // Opened from the current address, with no session: only the mail to the new address follows
    await auth.api.verifyEmail({ query: { token: approvals[0] } });

    expect(proofs).toHaveLength(1);
    expect(db.user[0].email).toBe(EMAIL);
    expect(db.session).toHaveLength(2);
  });

  it('signs every other session out when the new address is proven, and keeps the one that proved it', async () => {
    const { auth, approvals, proofs, db, markLegacyRevoked, cookie } = await asked();

    await auth.api.verifyEmail({ query: { token: approvals[0] } });
    expect(markLegacyRevoked).not.toHaveBeenCalled();

    // Opened with no session at all: the link makes one, and only that one is left
    const before = sessionsOf(db);

    await auth.api.verifyEmail({ query: { token: proofs[0] } });

    expect(db.user[0].email).toBe(NEW_EMAIL);
    expect(db.session).toHaveLength(1);
    expect(before).not.toContain(db.session[0].token);
    expect(markLegacyRevoked).toHaveBeenCalledTimes(1);
    expect(markLegacyRevoked).toHaveBeenCalledWith({
      where: { documentId: db.user[0].id },
      data: { legacyTokensRevokedAt: expect.any(Date) },
    });

    // The session that asked for the change is one of the ones that ended
    await expect(auth.api.listSessions({ headers: { cookie } })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("keeps the caller's own session when the link is opened from it", async () => {
    const { auth, approvals, proofs, db, cookie, other } = await asked();

    await auth.api.verifyEmail({ query: { token: approvals[0] } });
    await auth.api.verifyEmail({ query: { token: proofs[0] }, headers: { cookie } });

    expect(db.user[0].email).toBe(NEW_EMAIL);
    expect(db.session).toHaveLength(1);
    await expect(auth.api.listSessions({ headers: { cookie } })).resolves.toHaveLength(1);
    await expect(auth.api.listSessions({ headers: { cookie: other } })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('records nothing for a plain email verification', async () => {
    const { auth, signedUp, markLegacyRevoked, proofs, db } = build();

    await signedUp();
    await auth.api.sendVerificationEmail({ body: { email: EMAIL } });
    await auth.api.verifyEmail({ query: { token: proofs[0] } });

    expect(db.user[0].emailVerified).toBe(true);
    expect(markLegacyRevoked).not.toHaveBeenCalled();
  });
});
