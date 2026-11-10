import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { defineAuth } from '../define-auth';
import { createEngine } from '../create-engine';
import type { AuthEngine } from '../../types';
import { lockoutKey } from '../lockout-counter';
import { normalizeEmail } from '../../../utils/normalize-email';
import { normalizeUsername } from '../../../utils/normalize-username';
import { createLockoutDb, type LockoutDb } from './lockout-db';

/** Better Auth's in-memory adapter in place of the Strapi adapter, as `create-engine.vitest.test.ts` does. */
const store = vi.hoisted(() => ({ db: {} as Record<string, Array<Record<string, unknown>>> }));

vi.mock('../adapter/adapter', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');

  return {
    strapiAdapter: () => (options: { advanced?: { database?: Record<string, unknown> } }) => {
      const { generateId: _generateId, ...database } = options.advanced?.database ?? {};
      const adapter = memoryAdapter(store.db)({
        ...options,
        advanced: { ...options.advanced, database },
      });

      return { ...adapter, id: 'strapi' };
    },
  };
});

const SECRET = 'test-secret-at-least-32-characters-long';
const SERVER_URL = 'http://localhost:1337';
const PASSWORD = 'Passw0rd!long';
const WRONG = 'not-the-password';
const EMAIL = 'ann@example.com';

interface Lockout {
  enabled: boolean;
  maxAttempts: number;
  durationMinutes: number;
}

let lockoutSettings: Lockout;
let lockoutDb: LockoutDb;

const fakeStrapi = () =>
  ({
    // No Users & Permissions origin: nothing old to sign out
    sessionManager: Object.assign(() => ({}), { hasOrigin: () => false }),
    config: {
      get: (path: string, fallback?: unknown) =>
        ({
          'plugin::end-users.secret': SECRET,
          // Many sign-ins from one address: the rate limiter is not what is tested here
          'plugin::end-users.rateLimit.enabled': false,
          'server.absoluteUrl': SERVER_URL,
        })[path] ?? fallback,
    },
    db: lockoutDb.db,
    dirs: { dist: { src: '/nonexistent/end-users/src' } },
    plugin: () => ({
      service: () => ({
        get: async () => ({
          signUp: { enabled: true, requireEmailVerification: false },
          redirects: { emailVerified: null, passwordReset: null, error: null },
          lockout: lockoutSettings,
          passwords: { minLength: 8, maxLength: 128, requireMixedClasses: false },
        }),
        sendTemplate: vi.fn(async () => {}),
      }),
    }),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }) as unknown as Core.Strapi;

const post = (path: string, body: unknown) =>
  new Request(`${SERVER_URL}/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const userRow = () => store.db.user[0];

describe('lockout', () => {
  let engine: AuthEngine;
  let resetLinks: Array<{ token: string }>;

  const signIn = (password: string) =>
    engine.handle(post('/sign-in/email', { email: EMAIL, password }));
  const signInAs = (username: string, password: string) =>
    engine.handle(post('/sign-in/username', { username, password }));

  const fail = async (times: number, attempt = signIn) => {
    for (let i = 0; i < times; i += 1) {
      expect((await attempt(WRONG)).status).toBe(401);
    }
  };

  const body = async (res: Response) => (await res.json()) as Record<string, unknown>;

  beforeEach(async () => {
    lockoutDb = await createLockoutDb();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));

    store.db = {
      user: [],
      session: [],
      account: [],
      verification: [],
      twoFactor: [],
      rateLimit: [],
    };
    lockoutSettings = { enabled: true, maxAttempts: 5, durationMinutes: 15 };
    resetLinks = [];

    engine = createEngine(
      fakeStrapi(),
      defineAuth({
        emailAndPassword: {
          async sendResetPassword({ token }: { token: string }) {
            resetLinks.push({ token });
          },
        },
      })
    );

    const res = await engine.handle(
      post('/sign-up/email', { email: EMAIL, password: PASSWORD, name: 'Ann', username: 'ann' })
    );

    expect(res.status).toBe(200);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await lockoutDb.connection.destroy();
  });

  const counterOf = async (identifier: string) =>
    lockoutDb.connection('eu_rate_limits').where('key', lockoutKey(identifier)).first();
  const counters = () => lockoutDb.connection('eu_rate_limits').select();

  it('locks after maxAttempts failures and refuses even the right password while locked', async () => {
    await fail(5);

    const refused = await signIn(PASSWORD);
    const refusedAgain = await signIn(WRONG);

    expect(refused.status).toBe(403);
    expect(refusedAgain.status).toBe(403);

    // The same body every time, and nothing in it that says when the lock ends
    const first = await body(refused);

    expect(first).toEqual({
      code: 'ACCOUNT_LOCKED',
      message: 'This account is locked. Try again later.',
    });
    expect(await body(refusedAgain)).toEqual(first);
    expect(JSON.stringify(first)).not.toMatch(/lockedUntil|until/i);
  });

  it('does not lock before maxAttempts failures', async () => {
    await fail(4);

    expect((await signIn(PASSWORD)).status).toBe(200);
  });

  it('lets the right password in after durationMinutes and resets the count', async () => {
    await fail(5);
    expect((await signIn(PASSWORD)).status).toBe(403);

    vi.setSystemTime(new Date('2026-11-05T10:14:59Z'));
    expect((await signIn(PASSWORD)).status).toBe(403);

    vi.setSystemTime(new Date('2026-11-05T10:15:01Z'));
    expect((await signIn(PASSWORD)).status).toBe(200);
    expect(userRow()).toMatchObject({ failedSignIns: 0, lockedUntil: null });

    // A fresh count: four failures after the lock do not lock it again
    await fail(4);
    expect((await signIn(PASSWORD)).status).toBe(200);
  });

  it('starts from zero after a lock has run out and the next password is wrong', async () => {
    await fail(5);
    vi.setSystemTime(new Date('2026-11-05T10:16:00Z'));

    await fail(1);

    expect(userRow()).toMatchObject({ failedSignIns: 1, lockedUntil: null });
  });

  it('resets the count on success', async () => {
    await fail(4);
    expect(userRow().failedSignIns).toBe(4);

    expect((await signIn(PASSWORD)).status).toBe(200);
    expect(userRow().failedSignIns).toBe(0);

    await fail(4);
    expect((await signIn(PASSWORD)).status).toBe(200);
  });

  it('counts username sign-ins too, and refuses them with the same answer', async () => {
    await fail(5, (password) => signInAs('ann', password));

    const byUsername = await signInAs('ann', PASSWORD);

    expect(byUsername.status).toBe(403);
    expect(await body(byUsername)).toMatchObject({ code: 'ACCOUNT_LOCKED' });
    // It is the account that is locked, not the way in
    expect((await signIn(PASSWORD)).status).toBe(403);
  });

  it('counts failures across the email and the username sign-in', async () => {
    await fail(3);
    await fail(2, (password) => signInAs('ann', password));

    expect((await signIn(PASSWORD)).status).toBe(403);
  });

  it('keeps the count per account', async () => {
    await engine.handle(
      post('/sign-up/email', { email: 'bob@example.com', password: PASSWORD, name: 'Bob' })
    );
    await fail(5);

    const bob = await engine.handle(
      post('/sign-in/email', { email: 'bob@example.com', password: PASSWORD })
    );

    expect(bob.status).toBe(200);
  });

  it('answers a wrong password for an address nobody has as it always did', async () => {
    const res = await engine.handle(
      post('/sign-in/email', { email: 'nobody@example.com', password: WRONG })
    );

    expect(res.status).toBe(401);
    expect(await body(res)).toMatchObject({ code: 'INVALID_EMAIL_OR_PASSWORD' });
  });

  it('locks an address nobody has after the same number of attempts, with the same answer', async () => {
    const stranger = (password: string) =>
      engine.handle(post('/sign-in/email', { email: 'Nobody@Example.com ', password }));

    for (let i = 0; i < 5; i += 1) {
      expect((await stranger(WRONG)).status).toBe(401);
    }

    const unknown = await stranger(WRONG);

    expect(unknown.status).toBe(403);

    await fail(5);

    const real = await signIn(WRONG);

    // The body of a real locked account, to the byte
    expect(real.status).toBe(403);
    expect(await body(unknown)).toEqual(await body(real));
    // The counter is kept under the normalized address
    expect((await counterOf(normalizeEmail(' Nobody@Example.com')))?.count).toBe(6);
  });

  it('locks an unknown username too', async () => {
    await fail(5, (password) => signInAs('ghost', password));

    const res = await signInAs('ghost', WRONG);

    expect(res.status).toBe(403);
    expect(await body(res)).toMatchObject({ code: 'ACCOUNT_LOCKED' });
    expect((await counterOf(normalizeUsername('ghost')))?.count).toBe(6);
  });

  it('locks at maxAttempts when many failures arrive at once', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => signIn(WRONG)));
    const statuses = results.map((res) => res.status);

    expect(statuses.filter((status) => status === 401)).toHaveLength(5);
    expect(statuses.filter((status) => status === 403)).toHaveLength(15);
    expect((await counterOf(EMAIL))?.count).toBe(20);
    // And the right password is refused while it is locked
    expect((await signIn(PASSWORD)).status).toBe(403);
  });

  it('locks an unknown address at maxAttempts when the failures arrive at once', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        engine.handle(post('/sign-in/email', { email: 'nobody@example.com', password: WRONG }))
      )
    );
    const statuses = results.map((res) => res.status);

    expect(statuses.filter((status) => status === 401)).toHaveLength(5);
    expect(statuses.filter((status) => status === 403)).toHaveLength(15);
  });

  it('keeps one counter for an account, whichever way it signs in', async () => {
    await fail(2);
    await fail(2, (password) => signInAs('ann', password));

    expect(await counters()).toHaveLength(1);
    expect((await counterOf(EMAIL))?.count).toBe(4);
  });

  it('does not extend the lock when someone keeps trying', async () => {
    await fail(5);

    vi.setSystemTime(new Date('2026-11-05T10:10:00Z'));
    expect((await signIn(WRONG)).status).toBe(403);

    vi.setSystemTime(new Date('2026-11-05T10:15:01Z'));
    expect((await signIn(PASSWORD)).status).toBe(200);
  });

  it('mirrors the lock into the user, and the success clears it and the counter', async () => {
    await fail(5);

    expect(userRow().failedSignIns).toBe(5);
    expect(new Date(userRow().lockedUntil as Date).getTime()).toBe(
      new Date('2026-11-05T10:15:00Z').getTime()
    );

    vi.setSystemTime(new Date('2026-11-05T10:15:01Z'));
    expect((await signIn(PASSWORD)).status).toBe(200);
    expect(await counters()).toHaveLength(0);
    expect(userRow()).toMatchObject({ failedSignIns: 0, lockedUntil: null });
  });

  describe('writes to the user', () => {
    /** The columns each write to the user row names, in order (the adapter assigns them in place). */
    const watch = () => {
      const writes: string[][] = [];

      store.db.user[0] = new Proxy(store.db.user[0], {
        set(row, key, value) {
          if (key === 'failedSignIns') {
            writes.push(['failedSignIns']);
          }

          return Reflect.set(row, key, value);
        },
      });

      return writes;
    };

    it('does not write the counter columns on a sign-in that needs nothing cleared', async () => {
      const writes = watch();

      expect((await signIn(PASSWORD)).status).toBe(200);
      expect((await signIn(PASSWORD)).status).toBe(200);
      expect(writes).toHaveLength(0);
      expect(userRow().lastSignInAt).toBeTruthy();
    });

    it('still clears what a failure wrote, even a single failure', async () => {
      await fail(1);

      expect(userRow().failedSignIns).toBe(1);

      const writes = watch();

      expect((await signIn(PASSWORD)).status).toBe(200);
      expect(writes).toHaveLength(1);
      expect(userRow()).toMatchObject({ failedSignIns: 0, lockedUntil: null });
    });

    it('clears a lock that has run out, though the counter was reset', async () => {
      await fail(5);

      vi.setSystemTime(new Date('2026-11-05T10:20:00Z'));

      expect((await signIn(PASSWORD)).status).toBe(200);
      expect(userRow()).toMatchObject({ failedSignIns: 0, lockedUntil: null });
    });
  });

  it('does nothing when lockout is off', async () => {
    lockoutSettings = { ...lockoutSettings, enabled: false };

    await fail(8);

    expect((await signIn(PASSWORD)).status).toBe(200);
    expect(userRow().failedSignIns ?? 0).toBe(0);
    expect(await counters()).toHaveLength(0);
  });

  it('reads the limits from the settings on every request', async () => {
    lockoutSettings = { enabled: true, maxAttempts: 2, durationMinutes: 60 };

    await fail(2);
    expect((await signIn(PASSWORD)).status).toBe(403);

    vi.setSystemTime(new Date('2026-11-05T10:30:00Z'));
    expect((await signIn(PASSWORD)).status).toBe(403);

    vi.setSystemTime(new Date('2026-11-05T11:00:01Z'));
    expect((await signIn(PASSWORD)).status).toBe(200);
  });

  it('unlock clears both fields', async () => {
    await fail(5);
    expect(userRow().lockedUntil).toBeInstanceOf(Date);

    await engine.unlock(userRow().id as string);

    expect(userRow()).toMatchObject({ failedSignIns: 0, lockedUntil: null });
    expect(await counterOf(EMAIL)).toBeUndefined();
    expect((await signIn(PASSWORD)).status).toBe(200);
  });

  it('refuses to unlock a user that does not exist', async () => {
    await expect(engine.unlock('missing')).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('reset-password clears both fields', async () => {
    await fail(5);
    expect((await signIn(PASSWORD)).status).toBe(403);

    await engine.sendPasswordReset(EMAIL, '/reset');
    expect(resetLinks).toHaveLength(1);

    const reset = await engine.handle(
      post('/reset-password', { token: resetLinks[0].token, newPassword: 'An0ther!password' })
    );

    expect(reset.status).toBe(200);
    expect(userRow()).toMatchObject({ failedSignIns: 0, lockedUntil: null });
    expect(await counterOf(EMAIL)).toBeUndefined();
    expect((await signIn('An0ther!password')).status).toBe(200);
  });

  it('leaves a lock alone when the reset fails', async () => {
    await fail(5);

    const reset = await engine.handle(
      post('/reset-password', { token: 'not-a-token', newPassword: 'An0ther!password' })
    );

    expect(reset.status).toBe(400);
    expect(userRow().lockedUntil).toBeInstanceOf(Date);
    expect((await counterOf(EMAIL))?.count).toBe(5);
  });
});
