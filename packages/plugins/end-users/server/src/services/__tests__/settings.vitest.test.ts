import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { defineAuth } from '../../engine/better-auth/define-auth';
import { PROFILE_UID } from '../../constants';
import { PERMISSIONS_TTL_MS } from '../ability';
import settingsService from '../settings';

const profileSchema = (extra: Record<string, unknown> = {}) => ({
  uid: PROFILE_UID,
  kind: 'collectionType',
  modelType: 'contentType',
  options: {},
  attributes: {
    user: { type: 'relation', relation: 'oneToOne', target: 'plugin::end-users.user' },
    company: { type: 'string' },
    newsletter: { type: 'boolean' },
    age: { type: 'integer' },
    bio: { type: 'text' },
    avatar: { type: 'media', multiple: false },
    friends: { type: 'relation', relation: 'oneToMany', target: 'api::friend.friend' },
    address: { type: 'component', component: 'shared.address' },
    internalNotes: { type: 'text', private: true },
    locked: { type: 'string', writable: false },
    createdAt: { type: 'datetime' },
    updatedAt: { type: 'datetime' },
    // What Strapi adds to every content type, draft and publish or not
    publishedAt: { type: 'datetime', configurable: false, writable: true, visible: true },
    ...extra,
  },
});

const PUBLIC = 'role-public';
const MEMBER = 'role-member';

interface SetupOptions {
  stored?: Record<string, unknown>;
  schema?: ReturnType<typeof profileSchema>;
  installed?: string[];
  trusted?: (url: string) => boolean;
  config?: Record<string, unknown>;
}

/** Whether a URL is on the app's origin, judged by its parsed origin; text that is no URL is not */
const isAppOrigin = (url: string) => {
  try {
    return new URL(url).origin === 'https://app.example.com';
  } catch {
    return false;
  }
};

const setup = ({
  stored = {},
  schema = profileSchema(),
  installed = ['emailPassword', 'username', 'twoFactor', 'magicLink'],
  trusted = isAppOrigin,
  config = {},
}: SetupOptions = {}) => {
  const values = new Map<string, unknown>(Object.entries(stored));

  const get = vi.fn(async ({ key }: { key: string }) => values.get(key) ?? null);
  const set = vi.fn(async ({ key, value }: { key: string; value: unknown }) => {
    values.set(key, value);
  });
  const del = vi.fn(async ({ key }: { key: string }) => {
    values.delete(key);
  });
  const store = vi.fn(() => ({ get, set, delete: del }));
  const contentType = vi.fn(() => schema);
  const findMany = vi.fn(async ({ where }: { where: { documentId: { $in: string[] } } }) =>
    [
      { documentId: PUBLIC, type: 'public' },
      { documentId: MEMBER, type: 'custom' },
    ].filter((role) => where.documentId.$in.includes(role.documentId))
  );
  const isTrustedOrigin = vi.fn(async (url: string) => trusted(url));
  const installedMethods = vi.fn(() => installed);
  const service = settingsService({
    strapi: {
      store,
      contentType,
      db: { query: vi.fn(() => ({ findMany })) },
      plugin: () => ({ service: () => ({ get: () => ({ isTrustedOrigin, installedMethods }) }) }),
      config: { get: (key: string) => config[key.replace('plugin::end-users.', '')] },
    } as unknown as Core.Strapi,
  });

  return { service, get, set, del, store, contentType, values, isTrustedOrigin };
};

/** The ValidationError of a failed call, with the path it names */
const refused = async (call: Promise<unknown>) => {
  try {
    await call;
  } catch (error) {
    const { name, details } = error as {
      name: string;
      details: { errors: Array<{ path: string[] }> };
    };

    return { name, path: details.errors[0].path };
  }

  return undefined;
};

describe('settings service', () => {
  describe('two writes at once on one server', () => {
    it('keep both changes: the writes run one after the other', async () => {
      const { service, get, set, values } = setup();
      const later = () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 5);
        });

      // The store answers after a moment, as a database does, so that two writes that read
      // together would both start from the same document
      const read = get.getMockImplementation() as (arg: { key: string }) => Promise<unknown>;
      const write = set.getMockImplementation() as (arg: {
        key: string;
        value: unknown;
      }) => Promise<void>;

      get.mockImplementation(async (arg) => {
        const found = (await read(arg)) ?? null;

        await later();

        return found === null ? null : structuredClone(found as object);
      });
      set.mockImplementation(async (arg) => {
        await later();
        await write(arg);
      });

      await Promise.all([
        service.set({ lockout: { maxAttempts: 3 } }),
        service.set({ passwords: { minLength: 12 } }),
        service.set({ redirects: { error: '/oops' } }),
      ]);

      expect(values.get('settings')).toMatchObject({
        lockout: { maxAttempts: 3 },
        passwords: { minLength: 12 },
        redirects: { error: '/oops' },
      });
      expect(await service.get()).toMatchObject({
        lockout: { maxAttempts: 3 },
        passwords: { minLength: 12 },
      });
    });

    it('runs the next write after one that was refused', async () => {
      const { service } = setup();
      const results = await Promise.allSettled([
        service.set({ lockout: { maxAttempts: 0 } }),
        service.set({ lockout: { maxAttempts: 4 } }),
      ]);

      expect(results.map((one) => one.status)).toEqual(['rejected', 'fulfilled']);
      expect((await service.get()).lockout.maxAttempts).toBe(4);
    });
  });

  // `@strapi/utils` reads the private attributes of a type from the global application
  beforeAll(() => {
    vi.stubGlobal('strapi', { config: { get: (_key: string, fallback: unknown) => fallback } });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('the fields of the profile a sign-up can write', () => {
    it('are the plain, writable, public attributes: never user, a relation, media or a component', () => {
      const { service, contentType } = setup();

      expect(service.signUpFields().sort()).toEqual(['age', 'bio', 'company', 'newsletter']);
      expect(contentType).toHaveBeenCalledWith(PROFILE_UID);
    });

    it('include what a project adds to the profile, with no change here', () => {
      const { service } = setup({ schema: profileSchema({ phone: { type: 'string' } }) });

      expect(service.signUpFields()).toContain('phone');
    });

    it("leave out the attributes Strapi adds to every content type, which are Strapi's to set", () => {
      const { service } = setup({
        schema: profileSchema({
          firstPublishedAt: { type: 'datetime', configurable: false, writable: true },
        }),
      });

      expect(service.signUpFields()).not.toContain('publishedAt');
      expect(service.signUpFields()).not.toContain('firstPublishedAt');
    });

    it('leave out an attribute the project marked private or read-only', () => {
      const { service } = setup();

      expect(service.signUpFields()).not.toContain('internalNotes');
      expect(service.signUpFields()).not.toContain('locked');
    });
  });

  describe('get', () => {
    it('fills defaults for keys a stored document lacks', async () => {
      const { service } = setup({
        stored: { settings: { passwords: { minLength: 12 }, signUp: { enabled: false } } },
      });

      expect(await service.get()).toEqual({
        signUp: {
          enabled: false,
          defaultRoles: [],
          requireEmailVerification: false,
          registrationFields: [],
        },
        redirects: { emailVerified: null, passwordReset: null, error: null },
        passwords: { minLength: 12, maxLength: 128, requireMixedClasses: false },
        lockout: { enabled: true, maxAttempts: 5, durationMinutes: 15 },
        methods: {
          emailPassword: true,
          username: true,
          twoFactor: true,
          magicLink: true,
          emailOtp: true,
          passkey: true,
        },
      });
    });

    it('takes the default for a stored value of the wrong type', async () => {
      const { service } = setup({ stored: { settings: { passwords: { minLength: 'long' } } } });

      expect((await service.get()).passwords.minLength).toBe(8);
    });

    it('moves the old registrationFields key into the document on first read and deletes it', async () => {
      const { service, set, del, values } = setup({ stored: { registrationFields: ['company'] } });

      expect((await service.get()).signUp.registrationFields).toEqual(['company']);
      expect(set).toHaveBeenCalledWith({
        key: 'settings',
        value: expect.objectContaining({
          signUp: expect.objectContaining({ registrationFields: ['company'] }),
        }),
      });
      expect(del).toHaveBeenCalledWith({ key: 'registrationFields' });
      expect(values.has('registrationFields')).toBe(false);
    });

    it('writes nothing when there is neither a document nor an old key', async () => {
      const { service, set, del } = setup();

      await service.get();

      expect(set).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    });

    describe('the cache', () => {
      afterEach(() => {
        vi.useRealTimers();
      });

      it('get is served from the cache for 30 s, and re-read at once after set', async () => {
        vi.useFakeTimers();

        const { service, get } = setup();
        const reads = () => get.mock.calls.filter(([{ key }]) => key === 'settings').length;

        await service.get();
        await service.get();
        expect(reads()).toBe(1);

        vi.advanceTimersByTime(PERMISSIONS_TTL_MS - 1);
        await service.get();
        expect(reads()).toBe(1);

        vi.advanceTimersByTime(2);
        await service.get();
        expect(reads()).toBe(2);

        await service.set({ passwords: { minLength: 10 } });
        const afterSet = reads();

        expect((await service.get()).passwords.minLength).toBe(10);
        expect(reads()).toBe(afterSet + 1);
      });

      it('a read that started before set does not cache the old values', async () => {
        const { service, get, values } = setup();
        let release: () => void = () => undefined;

        // The first read hangs on the store until the set below has been made
        get.mockImplementationOnce(
          async () =>
            new Promise((resolve) => {
              release = () => resolve(null);
            })
        );

        const slow = service.get();

        await service.set({ passwords: { minLength: 20 } });
        release();

        expect((await slow).passwords.minLength).toBe(8);
        expect(values.get('settings')).toMatchObject({ passwords: { minLength: 20 } });
        expect((await service.get()).passwords.minLength).toBe(20);
      });

      it('set patches the stored document, not a stale cached one', async () => {
        const { service, values } = setup();

        await service.get();
        // Another server saved behind this one's cache
        values.set('settings', { passwords: { minLength: 20 } });

        await service.set({ lockout: { maxAttempts: 9 } });

        expect(values.get('settings')).toMatchObject({
          passwords: { minLength: 20 },
          lockout: { maxAttempts: 9 },
        });
      });

      it('gives a copy, so a caller cannot change what is kept', async () => {
        const { service } = setup();

        (await service.get()).signUp.defaultRoles.push('x');

        expect((await service.get()).signUp.defaultRoles).toEqual([]);
      });
    });
  });

  describe('set', () => {
    it('stores the change over what is there and answers the settings as stored', async () => {
      const { service, values } = setup({ stored: { settings: { lockout: { maxAttempts: 9 } } } });

      const saved = await service.set({
        signUp: { registrationFields: [' company ', 'company', 'bio'] },
        passwords: { minLength: 10 },
      });

      expect(saved.signUp.registrationFields).toEqual(['company', 'bio']);
      expect(saved.passwords).toEqual({
        minLength: 10,
        maxLength: 128,
        requireMixedClasses: false,
      });
      expect(saved.lockout.maxAttempts).toBe(9);
      expect(values.get('settings')).toEqual(saved);
    });

    it('takes a default role that exists and is not Public', async () => {
      const { service } = setup();

      expect(
        (await service.set({ signUp: { defaultRoles: [MEMBER] } })).signUp.defaultRoles
      ).toEqual([MEMBER]);
    });

    it('takes a relative path and a trusted address as a redirect', async () => {
      const { service } = setup();

      const saved = await service.set({
        redirects: { emailVerified: '/welcome', passwordReset: 'https://app.example.com/reset' },
      });

      expect(saved.redirects).toEqual({
        emailVerified: '/welcome',
        passwordReset: 'https://app.example.com/reset',
        error: null,
      });
    });

    it.each(['/account/verified', '/%09/evil.com', '/a?next=/b#c'])(
      'takes %s as a relative path',
      async (path) => {
        const { service } = setup();

        expect(
          (await service.set({ redirects: { emailVerified: path } })).redirects.emailVerified
        ).toBe(path);
      }
    );

    it('refuses an own-key trick: __proto__ and constructor are not settings', async () => {
      const { service, set } = setup();

      for (const patch of [
        JSON.parse('{"__proto__": {"polluted": true}}'),
        JSON.parse('{"passwords": {"__proto__": 1}}'),
        { constructor: {} },
        { passwords: { constructor: 1 } },
      ]) {
        expect((await refused(service.set(patch)))?.name).toBe('ValidationError');
      }

      expect(set).not.toHaveBeenCalled();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    describe('refuses, naming the setting and storing nothing', () => {
      it.each([
        ['a tab in the path', { redirects: { error: '/\t/evil.com' } }, ['redirects', 'error']],
        ['a newline in the path', { redirects: { error: '/\n/evil.com' } }, ['redirects', 'error']],
        ['a backslash', { redirects: { error: '/\\evil.com' } }, ['redirects', 'error']],

        [
          'an untrusted redirect',
          { redirects: { emailVerified: 'https://evil.example.com' } },
          ['redirects', 'emailVerified'],
        ],
        [
          'a protocol-relative redirect',
          { redirects: { error: '//evil.example.com' } },
          ['redirects', 'error'],
        ],
        [
          'a registration field a sign-up cannot write',
          { signUp: { registrationFields: ['avatar'] } },
          ['signUp', 'registrationFields'],
        ],
        [
          'a role that does not exist',
          { signUp: { defaultRoles: ['nope'] } },
          ['signUp', 'defaultRoles'],
        ],
        [
          'the Public role as a default role',
          { signUp: { defaultRoles: [PUBLIC] } },
          ['signUp', 'defaultRoles'],
        ],
        ['minLength under 8', { passwords: { minLength: 7 } }, ['passwords', 'minLength']],
        [
          'minLength over maxLength',
          { passwords: { minLength: 50, maxLength: 20 } },
          ['passwords', 'minLength'],
        ],
        ['maxLength over 256', { passwords: { maxLength: 257 } }, ['passwords', 'maxLength']],
        ['maxAttempts under 1', { lockout: { maxAttempts: 0 } }, ['lockout', 'maxAttempts']],
        ['maxAttempts over 100', { lockout: { maxAttempts: 101 } }, ['lockout', 'maxAttempts']],
        [
          'durationMinutes under 1',
          { lockout: { durationMinutes: 0 } },
          ['lockout', 'durationMinutes'],
        ],
        [
          'durationMinutes over 1440',
          { lockout: { durationMinutes: 1441 } },
          ['lockout', 'durationMinutes'],
        ],
        [
          'a method that is not installed turned on',
          { methods: { passkey: true } },
          ['methods', 'passkey'],
        ],
        ['a setting that does not exist', { passwords: { nope: 1 } }, ['passwords', 'nope']],
        ['a value of the wrong type', { lockout: { enabled: 'yes' } }, ['lockout', 'enabled']],
      ])('%s', async (_name, patch, path) => {
        const { service, set } = setup();

        expect(await refused(service.set(patch as never))).toEqual({
          name: 'ValidationError',
          path,
        });
        expect(set).not.toHaveBeenCalled();
      });
    });

    it('lets a method that is not installed be turned off', async () => {
      const { service } = setup();

      expect((await service.set({ methods: { passkey: false } })).methods.passkey).toBe(false);
    });

    it('does not check what it was not given, so an old document does not block an unrelated change', async () => {
      const { service } = setup({ stored: { settings: { signUp: { defaultRoles: ['gone'] } } } });

      expect((await service.set({ lockout: { enabled: false } })).lockout.enabled).toBe(false);
    });
  });

  describe('getSignUpFields', () => {
    it('is the registration fields, as far as the profile can still take them', async () => {
      const { service } = setup({
        stored: {
          settings: { signUp: { registrationFields: ['company', 'gone', 'internalNotes'] } },
        },
      });

      expect(await service.getSignUpFields()).toEqual(['company']);
    });
  });

  describe('configSummary', () => {
    it('reports the configuration, with Better Auth defaults for an unset rate limit', () => {
      const { service } = setup({
        config: {
          secret: 'x'.repeat(40),
          trustedOrigins: ['https://app.example.com'],
          'cookies.crossSite': true,
          'cookies.domain': '.example.com',
          'session.expiresIn': '7d',
          'session.updateAge': 86400,
          'session.cookieCache': '5m',
          'rateLimit.enabled': true,
          'compat.usersPermissions': true,
          'compat.legacyJwt.until': '2027-01-01',
          explain: true,
        },
      });

      expect(service.configSummary()).toEqual({
        secret: { set: true, tooShort: false },
        trustedOrigins: ['https://app.example.com'],
        cookies: { crossSite: true, domain: '.example.com' },
        session: { expiresIn: '7d', updateAge: '86400', cookieCache: '5m' },
        rateLimit: { enabled: true, window: 10, max: 100, storage: 'memory' },
        compat: { usersPermissions: true, legacyJwtUntil: '2027-01-01' },
        explain: true,
        auth: { plugins: [], senders: [] },
      });
    });

    it('reports a configured rate limit, and a short or missing secret', () => {
      const short = setup({
        config: {
          secret: 'short',
          'rateLimit.window': 60,
          'rateLimit.max': 5,
          'rateLimit.storage': 'database',
        },
      }).service.configSummary();

      expect(short.secret).toEqual({ set: true, tooShort: true });
      expect(short.rateLimit).toEqual({ enabled: true, window: 60, max: 5, storage: 'database' });
      expect(setup().service.configSummary().secret).toEqual({ set: false, tooShort: false });
    });

    it('shows a change-email sender, and the senders of the plugins it re-exports', () => {
      const auth = defineAuth({
        user: { changeEmail: { sendChangeEmailConfirmation: async () => undefined } },
        plugins: [
          { id: 'two-factor', options: { otpOptions: { sendOTP: async () => undefined } } },
          { id: 'email-otp', options: { sendVerificationOTP: async () => undefined } },
        ],
      } as never);

      expect(setup({ config: { auth } }).service.configSummary().auth.senders).toEqual([
        'change-email',
        'email-otp',
        'two-factor-otp',
      ]);
    });

    it('lists the plugin ids and the templates the project sends from code', () => {
      const auth = defineAuth({
        emailVerification: { sendVerificationEmail: async () => undefined },
        emailAndPassword: { sendResetPassword: async () => undefined },
        plugins: [
          { id: 'magic-link', options: { sendMagicLink: async () => undefined } },
          { id: 'email-otp', options: {} },
          { id: 'have-i-been-pwned' },
        ] as never,
      });

      const summary = setup({ config: { auth } }).service.configSummary();

      expect(summary.auth).toEqual({
        plugins: ['magic-link', 'email-otp', 'have-i-been-pwned'],
        senders: ['verify-email', 'reset-password', 'magic-link'],
      });
    });

    it('never carries a secret value', () => {
      const secret = 'S3CRET-VALUE-that-must-not-leak-0123456789';
      const legacy = 'LEGACY-JWT-SECRET-that-must-not-leak';
      const { service } = setup({
        config: {
          secret,
          'compat.legacyJwt.secret': legacy,
          'compat.legacyJwt.until': '2027-01-01',
          auth: defineAuth({ emailAndPassword: { sendResetPassword: async () => undefined } }),
        },
      });

      const text = JSON.stringify(service.configSummary());

      expect(text).not.toContain(secret);
      expect(text).not.toContain(legacy);
      expect(text).not.toContain('S3CRET');
    });
  });
});
