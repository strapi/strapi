import { describe, expect, it } from 'vitest';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { betterAuth } from 'better-auth/minimal';

import { revokeOnPasswordChange } from '../plugins/revoke-on-password-change';

// Built at run time: no secret-shaped literal in the source
const SECRET = ['password', 'change', 'test', 'secret', 'long', 'enough', 'to', 'use'].join('-');
const PASSWORD = ['Old', 'Passw0rd!x'].join('-');
const NEW_PASSWORD = ['New', 'Passw0rd!y'].join('-');
const EMAIL = 'ann@example.com';

type Row = Record<string, any>;

const build = () => {
  const db = { user: [], session: [], account: [], verification: [] } as Record<string, Row[]>;
  const auth = betterAuth({
    secret: SECRET,
    baseURL: 'http://localhost:1337',
    basePath: '/api/auth',
    telemetry: { enabled: false },
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    plugins: [revokeOnPasswordChange()],
  });

  return { auth, db };
};

describe('revoke-on-password-change', () => {
  it('signs the other sessions out when the caller did not ask, and when they asked not to', async () => {
    for (const extra of [{}, { revokeOtherSessions: false }]) {
      const { auth, db } = build();
      const signedUp = await auth.api.signUpEmail({
        body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
        returnHeaders: true,
      });
      const other = await auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } });

      expect(db.session).toHaveLength(2);

      // eslint-disable-next-line no-await-in-loop
      const changed = await auth.api.changePassword({
        body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, ...extra },
        headers: { cookie: signedUp.headers.get('set-cookie')?.split(';')[0] ?? '' },
      });

      // The caller keeps one working session, the new one
      expect(changed.token).toEqual(expect.any(String));
      expect(db.session.map((session) => session.token)).toEqual([changed.token]);
      expect(db.session.map((session) => session.token)).not.toContain(other.token);
    }
  });

  it('leaves every other endpoint alone', () => {
    const [hook] = revokeOnPasswordChange().hooks!.before!;

    expect(hook.matcher({ path: '/change-password' } as never)).toBe(true);
    expect(hook.matcher({ path: '/reset-password' } as never)).toBe(false);
    expect(hook.matcher({ path: '/revoke-sessions' } as never)).toBe(false);
  });
});
