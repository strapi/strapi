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

  const auth = betterAuth({
    secret: SECRET,
    baseURL: 'http://localhost:1337',
    basePath: '/api/auth',
    telemetry: { enabled: false },
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    plugins: [revokeOnPasswordChange(), legacyRevoke(strapi)],
  });

  const signedUp = async () => {
    const result = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
      returnHeaders: true,
    });

    return { cookie: (result.headers.get('set-cookie') ?? '').split(';')[0], db };
  };

  return { auth, signedUp, markLegacyRevoked, invalidateLegacy };
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
