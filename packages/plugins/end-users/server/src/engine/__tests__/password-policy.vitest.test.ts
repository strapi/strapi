import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailOTP, phoneNumber } from 'better-auth/plugins';
import type { Core } from '@strapi/types';

import { defineAuth } from '../better-auth/define-auth';
import { createEngine } from '../better-auth/create-engine';
import { passwordProblem } from '../password-policy';
import type { AuthEngine } from '../types';
import { createLockoutDb, type LockoutDb } from '../better-auth/__tests__/lockout-db';

/** Better Auth's in-memory adapter in place of the Strapi adapter, as `create-engine.vitest.test.ts` does. */
const store = vi.hoisted(() => ({ db: {} as Record<string, Array<Record<string, unknown>>> }));

vi.mock('../better-auth/adapter/adapter', async () => {
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
const EMAIL = 'ann@example.com';
const GOOD = 'Passw0rd!long';

interface Policy {
  minLength: number;
  maxLength: number;
  requireMixedClasses: boolean;
}

const DEFAULTS: Policy = { minLength: 8, maxLength: 128, requireMixedClasses: false };

let passwords: Policy;
let lockoutDb: LockoutDb;
let compatOn = false;

const fakeStrapi = () =>
  ({
    // No Users & Permissions origin: nothing old to sign out
    sessionManager: Object.assign(() => ({}), { hasOrigin: () => false }),
    config: {
      get: (path: string, fallback?: unknown) =>
        ({
          'plugin::end-users.secret': SECRET,
          // Several requests from one address: the rate limiter is not what is tested here
          'plugin::end-users.rateLimit.enabled': false,
          'server.absoluteUrl': SERVER_URL,
          'plugin::end-users.compat.usersPermissions': compatOn,
        })[path] ?? fallback,
    },
    // A password reset forgets the lockout counter
    db: lockoutDb.db,
    dirs: { dist: { src: '/nonexistent/end-users/src' } },
    plugin: () => ({
      service: () => ({
        // Read on every request, as the real service is
        get: async () => ({
          signUp: { enabled: true, requireEmailVerification: false },
          redirects: { emailVerified: null, passwordReset: null, error: null },
          // Off: sign-ins are checked here, and the lockout counter is not what is tested
          lockout: { enabled: false, maxAttempts: 5, durationMinutes: 15 },
          passwords,
        }),
        sendTemplate: vi.fn(async () => {}),
      }),
    }),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }) as unknown as Core.Strapi;

const post = (path: string, body: unknown, cookie?: string) =>
  new Request(`${SERVER_URL}/api/auth${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: SERVER_URL,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

describe('passwordProblem', () => {
  it('refuses a password shorter than minLength', () => {
    expect(passwordProblem('short', DEFAULTS)).toBe(
      'The password must be at least 8 characters long.'
    );
    expect(passwordProblem('12345678', DEFAULTS)).toBeNull();
  });

  it('refuses a password longer than maxLength', () => {
    expect(passwordProblem('x'.repeat(129), DEFAULTS)).toBe(
      'The password must be at most 128 characters long.'
    );
    expect(passwordProblem('x'.repeat(128), DEFAULTS)).toBeNull();
  });

  it('refuses a password with fewer than three classes when mixed classes are required', () => {
    const policy = { ...DEFAULTS, requireMixedClasses: true };

    expect(passwordProblem('alllowercase', policy)).toMatch(/at least three of/);
    expect(passwordProblem('lower-and-123', policy)).toBeNull();
    expect(passwordProblem('Lower1234567', policy)).toBeNull();
    expect(passwordProblem('UPPER123456', policy)).toMatch(/at least three of/);
    expect(passwordProblem('Lowercase', policy)).toMatch(/at least three of/);
  });

  it('accepts any classes when mixed classes are not required', () => {
    expect(passwordProblem('alllowercase', DEFAULTS)).toBeNull();
  });
});

describe('passwordProblem and bcrypt', () => {
  const at72 = 'a'.repeat(72);
  // 36 characters, 72 bytes; one more character makes it 74
  const twoByte = 'é'.repeat(36);

  it('refuses more than 72 bytes only when bcrypt is on', () => {
    const wide = { ...DEFAULTS, maxLength: 256 };

    expect(passwordProblem(`${at72}b`, wide, { bcrypt: true })).toBe(
      'The password must be at most 72 bytes long.'
    );
    expect(passwordProblem(`${twoByte}é`, wide, { bcrypt: true })).toMatch(/72 bytes/);
    expect(passwordProblem(at72, wide, { bcrypt: true })).toBeNull();
    expect(passwordProblem(twoByte, wide, { bcrypt: true })).toBeNull();
    expect(passwordProblem(`${at72}b`, wide)).toBeNull();
    expect(passwordProblem(`${twoByte}é`, wide, { bcrypt: false })).toBeNull();
  });
});

describe('password-policy', () => {
  let engine: AuthEngine;
  let resetTokens: string[];

  const signUp = (password: string, email = EMAIL) =>
    engine.handle(post('/sign-up/email', { email, password, name: 'Ann' }));

  const code = async (res: Response) => ((await res.json()) as { code?: string }).code;

  beforeEach(async () => {
    lockoutDb = await createLockoutDb();
    store.db = {
      user: [],
      session: [],
      account: [],
      verification: [],
      twoFactor: [],
      rateLimit: [],
    };
    passwords = { ...DEFAULTS };
    compatOn = false;
    resetTokens = [];

    engine = createEngine(
      fakeStrapi(),
      defineAuth({
        emailAndPassword: {
          async sendResetPassword({ token }: { token: string }) {
            resetTokens.push(token);
          },
        },
      })
    );
  });

  afterEach(async () => {
    await lockoutDb.connection.destroy();
  });

  it('refuses a password that is too short', async () => {
    const res = await signUp('short');

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: 'PASSWORD_TOO_WEAK',
      message: 'The password must be at least 8 characters long.',
    });
    expect(store.db.user).toHaveLength(0);
  });

  it('refuses a password that is too long', async () => {
    passwords.maxLength = 20;

    const res = await signUp('x'.repeat(21));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: 'PASSWORD_TOO_WEAK',
      message: 'The password must be at most 20 characters long.',
    });
  });

  it('refuses too few character classes only when mixed classes are required', async () => {
    passwords.requireMixedClasses = true;

    const refused = await signUp('alllowercase');

    expect(refused.status).toBe(400);
    expect(await code(refused)).toBe('PASSWORD_TOO_WEAK');
    expect((await signUp(GOOD)).status).toBe(200);

    passwords.requireMixedClasses = false;

    expect((await signUp('alllowercase', 'bob@example.com')).status).toBe(200);
  });

  it('applies a changed minLength on the next request, with no rebuild', async () => {
    expect((await signUp('twelve-chars')).status).toBe(200);

    passwords.minLength = 16;

    const res = await signUp('twelve-chars', 'bob@example.com');

    expect(res.status).toBe(400);
    expect((await res.json()) as { message: string }).toMatchObject({
      message: 'The password must be at least 16 characters long.',
    });

    passwords.minLength = 8;

    expect((await signUp('twelve-chars', 'bob@example.com')).status).toBe(200);
  });

  it('applies to change-password and reset-password', async () => {
    const res = await signUp(GOOD);
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');

    const weakChange = await engine.handle(
      post('/change-password', { currentPassword: GOOD, newPassword: 'short' }, cookie)
    );

    expect(weakChange.status).toBe(400);
    expect(await code(weakChange)).toBe('PASSWORD_TOO_WEAK');

    const goodChange = await engine.handle(
      post('/change-password', { currentPassword: GOOD, newPassword: 'An0ther!password' }, cookie)
    );

    expect(goodChange.status).toBe(200);

    await engine.sendPasswordReset(EMAIL, '/reset');

    const weakReset = await engine.handle(
      post('/reset-password', { token: resetTokens[0], newPassword: 'short' })
    );

    expect(weakReset.status).toBe(400);
    expect(await code(weakReset)).toBe('PASSWORD_TOO_WEAK');

    const goodReset = await engine.handle(
      post('/reset-password', { token: resetTokens[0], newPassword: 'Yet4nother!password' })
    );

    expect(goodReset.status).toBe(200);
  });

  describe('the 72 bytes bcrypt reads', () => {
    // 38 characters, 76 bytes
    const long = 'é'.repeat(38);
    const ok = 'An0ther!password';

    beforeEach(() => {
      passwords = { ...DEFAULTS, maxLength: 256 };
    });

    const build = () => {
      engine = createEngine(
        fakeStrapi(),
        defineAuth({
          emailAndPassword: {
            async sendResetPassword({ token }: { token: string }) {
              resetTokens.push(token);
            },
          },
        })
      );
    };

    const everyPath = async () => {
      const results: Response[] = [await signUp(long, 'new@example.com')];
      const res = await signUp(GOOD);
      const cookie = res.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');

      results.push(
        await engine.handle(
          post('/change-password', { currentPassword: GOOD, newPassword: long }, cookie)
        )
      );

      await engine.sendPasswordReset(EMAIL, '/reset');
      results.push(
        await engine.handle(post('/reset-password', { token: resetTokens[0], newPassword: long }))
      );

      return results;
    };

    it('is refused at sign-up, change and reset with compat on', async () => {
      compatOn = true;
      build();

      for (const res of await everyPath()) {
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({
          code: 'PASSWORD_TOO_WEAK',
          message: 'The password must be at most 72 bytes long.',
        });
      }

      expect((await signUp(ok, 'fine@example.com')).status).toBe(200);
    });

    it('is accepted with compat off', async () => {
      for (const res of await everyPath()) {
        expect(res.status).toBe(200);
      }
    });

    it('is refused when an administrator sets it, with compat on only', async () => {
      await signUp(GOOD);

      const userId = String(store.db.user[0].id);

      await expect(engine.setPassword(userId, long)).resolves.toBeUndefined();

      compatOn = true;
      build();

      await expect(engine.setPassword(userId, long)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'The password must be at most 72 bytes long.',
      });
    });
  });

  it('refuses a weak password set in the Content Manager', async () => {
    await signUp(GOOD);

    const userId = String(store.db.user[0].id);

    passwords.requireMixedClasses = true;

    await expect(engine.setPassword(userId, 'alllowercase')).rejects.toMatchObject({
      name: 'ValidationError',
      message: passwordProblem('alllowercase', passwords),
    });
    await expect(engine.setPassword(userId, 'short')).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'The password must be at least 8 characters long.',
    });
    await expect(engine.setPassword(userId, 'An0ther!password')).resolves.toBeUndefined();
  });

  it('does not refuse a sign-in for a weak password, which only checks the one that is stored', async () => {
    await signUp(GOOD);
    passwords.minLength = 40;

    const wrong = await engine.handle(post('/sign-in/email', { email: EMAIL, password: 'short' }));

    expect(wrong.status).toBe(401);
    expect(await code(wrong)).toBe('INVALID_EMAIL_OR_PASSWORD');

    // The right one, though it is below the new minimum, still signs in
    expect(
      (await engine.handle(post('/sign-in/email', { email: EMAIL, password: GOOD }))).status
    ).toBe(200);
  });

  describe('paths of the opt-in plugins', () => {
    beforeEach(() => {
      engine = createEngine(
        fakeStrapi(),
        defineAuth({
          plugins: [
            emailOTP({ sendVerificationOTP: async () => undefined }),
            phoneNumber({
              sendOTP: async () => undefined,
              sendPasswordResetOTP: async () => undefined,
            }),
          ],
        } as never)
      );
    });

    it('refuses a weak password on /email-otp/reset-password (`password`)', async () => {
      const weak = await engine.handle(
        post('/email-otp/reset-password', { email: EMAIL, otp: '123456', password: 'short' })
      );

      expect(weak.status).toBe(400);
      expect(await code(weak)).toBe('PASSWORD_TOO_WEAK');

      // A good one passes the policy and meets the plugin's own check of the code instead
      const good = await engine.handle(
        post('/email-otp/reset-password', { email: EMAIL, otp: '123456', password: GOOD })
      );

      expect(await code(good)).not.toBe('PASSWORD_TOO_WEAK');
    });

    it('refuses a weak password on /phone-number/reset-password (`newPassword`)', async () => {
      const weak = await engine.handle(
        post('/phone-number/reset-password', {
          phoneNumber: '+15550100',
          otp: '123456',
          newPassword: 'short',
        })
      );

      expect(weak.status).toBe(400);
      expect(await code(weak)).toBe('PASSWORD_TOO_WEAK');

      const good = await engine.handle(
        post('/phone-number/reset-password', {
          phoneNumber: '+15550100',
          otp: '123456',
          newPassword: GOOD,
        })
      );

      expect(await code(good)).not.toBe('PASSWORD_TOO_WEAK');
    });
  });
});
