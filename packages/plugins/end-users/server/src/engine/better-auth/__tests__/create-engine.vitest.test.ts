import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
// The merge Strapi's plugin loader applies (core/core loaders/plugins); a dev-only import of a hoisted package
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import { defaultsDeep } from 'lodash';
import { errors, importDefault } from '@strapi/utils';
import { createAuthEndpoint } from 'better-auth/api';
import { getBooleanEnvVar } from 'better-auth';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { defineAuth } from '../define-auth';
import { toFetchRequest } from '../handler';
import { koaCtx } from './utils/koa-ctx';
import { createLockoutDb, type LockoutDb } from './lockout-db';
import { passkey } from '../public/passkey';
import { captcha, magicLink } from '../public/plugins';
import pluginConfig from '../../../config/index';
import {
  buildAuthOptions,
  createEngine,
  experimentalAuthOptions,
  loadProjectAuth,
} from '../create-engine';
import { DISCOVERY_TIMEOUT_MS } from '../../../providers/discovery';
import type { AuthEngine } from '../../types';
import { emptyStartupInputs } from '../../startup-inputs';
import type { StartupInputs } from '../../startup-inputs';

/**
 * The engine is exercised against Better Auth's in-memory adapter instead of the Strapi adapter
 * (which has its own tests): everything else is the real thing, the real options included.
 * The memory adapter is given the options without `generateId: false`, because it has no database
 * to hand out ids.
 */
const store = vi.hoisted(() => ({ db: {} as Record<string, Array<Record<string, unknown>>> }));

/** One empty table per model the engine can have. The memory adapter clones this per transaction. */
const emptyDatabase = () => ({
  user: [],
  session: [],
  account: [],
  verification: [],
  twoFactor: [],
  rateLimit: [],
  note: [],
  fileNote: [],
});

vi.mock('../adapter/adapter', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');

  return {
    strapiAdapter: () => (options: { advanced?: { database?: Record<string, unknown> } }) => {
      const { generateId: _generateId, ...database } = options.advanced?.database ?? {};

      const adapter = memoryAdapter(store.db)({
        ...options,
        advanced: { ...options.advanced, database },
      });

      // Better Auth reports a misconfiguration for "memory with generateId: false", which is the
      // production setup for the adapter this stands in for
      return { ...adapter, id: 'strapi' };
    },
  };
});

type TemplateSender = (
  key: string,
  to: string,
  data: Record<string, unknown>,
  options: { locale?: string }
) => Promise<void>;

const SECRET = 'test-secret-at-least-32-characters-long';
const SERVER_URL = 'http://localhost:1337';

type ConfigValues = Record<string, unknown>;

interface Email {
  user: { email: string };
  url: string;
  token: string;
}

/** What Better Auth hands a sender; typed so the test can read the call back. */
const sender = () =>
  vi.fn<(data: Email, request?: Request) => Promise<void>>().mockResolvedValue(undefined);

// The lockout counter is one SQL statement, so every sign-in needs a database: one SQLite for the
// file, with its table emptied before each test
let lockoutDb: LockoutDb;

beforeAll(async () => {
  lockoutDb = await createLockoutDb();
});

afterAll(async () => {
  await lockoutDb.connection.destroy();
});

beforeEach(async () => {
  await lockoutDb.connection('eu_rate_limits').delete();
});

const fakeStrapi = (values: ConfigValues = {}, distSrc = '/nonexistent/end-users/src') => {
  const all: ConfigValues = {
    'plugin::end-users.secret': SECRET,
    // These tests sign in from one address, many times: the limit is off unless a case turns it on
    'plugin::end-users.rateLimit.enabled': false,
    // Strapi always derives this one, from the host and port, whatever `url` says
    'server.absoluteUrl': SERVER_URL,
    ...values,
  };

  return {
    config: {
      get: (path: string, fallback?: unknown) => (path in all ? all[path] : fallback),
    },
    // Read when a request arrives, after `beforeAll` has made the database
    get db() {
      return lockoutDb.db;
    },
    dirs: { dist: { src: distSrc } },
    // The settings the `strapi-email` and `lockout` plugins read, and the email plugin's templates, which send nothing
    plugin: () => ({
      service: () => ({
        get: async () => ({
          signUp: { enabled: true, requireEmailVerification: false },
          redirects: { emailVerified: null, passwordReset: null, error: null },
          lockout: { enabled: true, maxAttempts: 5, durationMinutes: 15 },
          passwords: { minLength: 8, maxLength: 128, requireMixedClasses: false },
        }),
        sendTemplate: vi.fn(async () => {}),
      }),
    }),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  } as unknown as Core.Strapi;
};

const json = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${SERVER_URL}/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const PASSWORD = 'Passw0rd!long';

interface SignedUp {
  userId: string;
  email: string;
  token: string;
  /** The signed token, as the session cookie and Bearer clients carry it. */
  signed: string;
  cookie: string;
}

const signUp = async (engine: AuthEngine, email = 'a@x.io'): Promise<SignedUp> => {
  const res = await engine.handle(
    json(
      '/sign-up/email',
      { email, password: PASSWORD, name: 'A' },
      { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'vitest' }
    )
  );
  const body = (await res.json()) as { token: string; user: { id: string } };
  const signed = res.headers.get('set-auth-token') as string;
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('strapi.session_token='));

  expect(res.status).toBe(200);

  return {
    userId: body.user.id,
    email,
    token: body.token,
    signed,
    cookie: (cookie as string).split(';')[0],
  };
};

const signIn = (engine: AuthEngine, email: string, password: string) =>
  engine.handle(json('/sign-in/email', { email, password }));

const bearer = (signed: string) => new Headers({ authorization: `Bearer ${signed}` });

const rowsOf = (model: string) => store.db[model] ?? [];

describe('buildAuthOptions', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves everything under /api/auth with the strapi cookie prefix', () => {
    const options = buildAuthOptions(fakeStrapi());

    expect(options.basePath).toBe('/api/auth');
    expect(options.advanced?.cookiePrefix).toBe('strapi');
  });

  // Better Auth turns its origin and CSRF checks off when NODE_ENV is "test" and the option is not
  // set (`skipOriginCheck` in better-auth/dist/context/create-context.mjs), so a test would pass
  // whether or not `trustedOrigins` reached it. Set, `false` keeps them on in every environment.
  it('keeps the origin check on whatever NODE_ENV is', () => {
    for (const env of ['test', 'development', 'production']) {
      vi.stubEnv('NODE_ENV', env);

      expect(buildAuthOptions(fakeStrapi()).advanced?.disableOriginCheck, env).toBe(false);
      expect(buildAuthOptions(fakeStrapi()).advanced?.disableCSRFCheck, env).toBe(false);
    }
  });

  it('takes the secret from the plugin config', () => {
    expect(buildAuthOptions(fakeStrapi()).secret).toBe(SECRET);
    expect(
      buildAuthOptions(fakeStrapi({ 'plugin::end-users.secret': 'another-secret' })).secret
    ).toBe('another-secret');
  });

  it('leaves ids to Strapi', () => {
    expect(buildAuthOptions(fakeStrapi()).advanced?.database?.generateId).toBe(false);
  });

  it('turns on email and password, with a verifier that also takes bcrypt hashes', async () => {
    const { emailAndPassword } = buildAuthOptions(fakeStrapi());
    const bcryptHash = await bcrypt.hash('legacy-pass', 4);

    expect(emailAndPassword?.enabled).toBe(true);
    await expect(
      emailAndPassword?.password?.verify?.({ hash: bcryptHash, password: 'legacy-pass' })
    ).resolves.toBe(true);
  });

  it("installs username, two-factor, bearer and admin, then the plugin's own, in that order", () => {
    const ids = buildAuthOptions(fakeStrapi()).plugins?.map((plugin) => plugin.id);

    expect(ids).toEqual([
      'username',
      'two-factor',
      'bearer',
      'admin',
      'strapi-normalize',
      'strapi-profile',
      'strapi-email',
      'lockout',
      'password-policy',
      'last-sign-in',
      'provider-profile',
    ]);
  });

  it('puts two-factor before bearer, so the token is not for a session two-factor deleted', () => {
    const ids = buildAuthOptions(fakeStrapi()).plugins?.map((plugin) => plugin.id) ?? [];

    expect(ids.indexOf('two-factor')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('two-factor')).toBeLessThan(ids.indexOf('bearer'));
  });

  it('puts two-factor before bearer when the project adds plugins too', () => {
    const ids =
      buildAuthOptions(
        fakeStrapi(),
        defineAuth({ plugins: [{ id: 'project-plugin' }] })
      ).plugins?.map((plugin) => plugin.id) ?? [];

    expect(ids.indexOf('two-factor')).toBeLessThan(ids.indexOf('bearer'));
  });

  it('adds the project plugins after the plugin ones', () => {
    const projectPlugin: BetterAuthPlugin = { id: 'project-plugin' };
    const ids = buildAuthOptions(
      fakeStrapi(),
      defineAuth({ plugins: [projectPlugin] })
    ).plugins?.map((plugin) => plugin.id);

    expect(ids).toEqual([
      'username',
      'two-factor',
      'bearer',
      'admin',
      'strapi-normalize',
      'strapi-profile',
      'strapi-email',
      'lockout',
      'password-policy',
      'last-sign-in',
      'provider-profile',
      'project-plugin',
    ]);
  });

  describe('base path', () => {
    it('follows the REST prefix of the application, so the routes and the router agree', () => {
      expect(buildAuthOptions(fakeStrapi({ 'api.rest.prefix': '/v1' })).basePath).toBe('/v1/auth');
      expect(buildAuthOptions(fakeStrapi({ 'api.rest.prefix': '/v1/' })).basePath).toBe('/v1/auth');
      expect(buildAuthOptions(fakeStrapi({ 'api.rest.prefix': 'v1' })).basePath).toBe('/v1/auth');
      expect(buildAuthOptions(fakeStrapi({ 'api.rest.prefix': '' })).basePath).toBe('/auth');
    });

    it('is /api/auth with the default prefix', () => {
      expect(buildAuthOptions(fakeStrapi({ 'api.rest.prefix': '/api' })).basePath).toBe(
        '/api/auth'
      );
    });

    it('cannot be changed by the project', () => {
      const forged = {
        kind: 'end-users:auth',
        options: { basePath: '/somewhere' },
      } as unknown as ReturnType<typeof defineAuth>;

      expect(buildAuthOptions(fakeStrapi(), forged).basePath).toBe('/api/auth');
    });
  });

  describe('trusted origins', () => {
    it('come from the plugin config', () => {
      const options = buildAuthOptions(
        fakeStrapi({ 'plugin::end-users.trustedOrigins': ['https://app.example.com'] })
      );

      expect(options.trustedOrigins).toEqual(['https://app.example.com']);
    });

    it('are the server itself when none are configured', () => {
      expect(buildAuthOptions(fakeStrapi()).trustedOrigins ?? []).toEqual([]);
    });

    it('are the plugin config alone: the project has no list of its own to add', () => {
      // defineAuth refuses `trustedOrigins`; a result that did not come from it is stripped
      for (const trustedOrigins of [
        ['https://other.example.com', '*'],
        () => ['https://dynamic.example.com'],
      ]) {
        const forged = {
          kind: 'end-users:auth',
          options: { trustedOrigins },
        } as unknown as ReturnType<typeof defineAuth>;

        const options = buildAuthOptions(
          fakeStrapi({ 'plugin::end-users.trustedOrigins': ['https://app.example.com'] }),
          forged
        );

        expect(options.trustedOrigins).toEqual(['https://app.example.com']);
      }

      expect(
        buildAuthOptions(fakeStrapi(), {
          kind: 'end-users:auth',
          options: { trustedOrigins: ['*'] },
        } as unknown as ReturnType<typeof defineAuth>).trustedOrigins ?? []
      ).toEqual([]);
    });
  });

  describe('the origin and CSRF checks', () => {
    it('stay on whatever the project says, even without defineAuth', () => {
      for (const advanced of [
        { disableOriginCheck: true },
        { disableCSRFCheck: true },
        { disableOriginCheck: true, disableCSRFCheck: true },
        { disableOriginCheck: ['/sign-in/email'] },
        { disableOriginCheck: 1, disableCSRFCheck: 'yes' },
      ]) {
        const forged = {
          kind: 'end-users:auth',
          options: { advanced: { ...advanced, useSecureCookies: true } },
        } as unknown as ReturnType<typeof defineAuth>;

        const options = buildAuthOptions(fakeStrapi(), forged);

        expect(options.advanced?.disableOriginCheck, JSON.stringify(advanced)).toBe(false);
        expect(options.advanced?.disableCSRFCheck, JSON.stringify(advanced)).toBe(false);
        // the rest of the group is still the project's
        expect(options.advanced?.useSecureCookies).toBe(true);
      }
    });

    it('are on without any project options', () => {
      const options = buildAuthOptions(fakeStrapi());

      expect(options.advanced?.disableOriginCheck).toBe(false);
      expect(options.advanced?.disableCSRFCheck).toBe(false);
    });
  });

  describe('cookies', () => {
    it('are SameSite=None and Secure for a front end on another site', () => {
      const options = buildAuthOptions(fakeStrapi({ 'plugin::end-users.cookies.crossSite': true }));

      expect(options.advanced?.defaultCookieAttributes).toEqual({ sameSite: 'none', secure: true });
    });

    it('keep Better Auth defaults otherwise', () => {
      expect(
        buildAuthOptions(fakeStrapi({ 'plugin::end-users.cookies.crossSite': false })).advanced
          ?.defaultCookieAttributes
      ).toBeUndefined();
      expect(buildAuthOptions(fakeStrapi()).advanced?.defaultCookieAttributes).toBeUndefined();
    });

    it('are shared across subdomains when a domain is configured', () => {
      const options = buildAuthOptions(
        fakeStrapi({ 'plugin::end-users.cookies.domain': '.example.com' })
      );

      expect(options.advanced?.crossSubDomainCookies).toEqual({
        enabled: true,
        domain: '.example.com',
      });
    });

    it('keep the cookie prefix and the id setting next to them', () => {
      const { advanced } = buildAuthOptions(
        fakeStrapi({
          'plugin::end-users.cookies.crossSite': true,
          'plugin::end-users.cookies.domain': '.example.com',
        })
      );

      expect(advanced?.cookiePrefix).toBe('strapi');
      expect(advanced?.database?.generateId).toBe(false);
    });
  });

  describe('session', () => {
    it('takes its lifetimes from the plugin config, in seconds', () => {
      const { session } = buildAuthOptions(
        fakeStrapi({
          'plugin::end-users.session.expiresIn': '7d',
          'plugin::end-users.session.updateAge': '1d',
          'plugin::end-users.session.cookieCache': '5m',
        })
      );

      expect(session?.expiresIn).toBe(7 * 24 * 60 * 60);
      expect(session?.updateAge).toBe(24 * 60 * 60);
      expect(session?.cookieCache).toEqual({ enabled: true, maxAge: 5 * 60 });
    });

    it('takes plain seconds too', () => {
      expect(
        buildAuthOptions(fakeStrapi({ 'plugin::end-users.session.expiresIn': 3600 })).session
          ?.expiresIn
      ).toBe(3600);
    });

    it('can switch the cookie cache off', () => {
      expect(
        buildAuthOptions(fakeStrapi({ 'plugin::end-users.session.cookieCache': false })).session
          ?.cookieCache
      ).toEqual({ enabled: false });
    });

    it('leaves Better Auth defaults when nothing is configured', () => {
      const { session } = buildAuthOptions(fakeStrapi());

      expect(session?.expiresIn).toBeUndefined();
      expect(session?.updateAge).toBeUndefined();
      expect(session?.cookieCache).toBeUndefined();
    });

    it('is overridden by the project, key by key', () => {
      const { session } = buildAuthOptions(
        fakeStrapi({
          'plugin::end-users.session.expiresIn': '7d',
          'plugin::end-users.session.updateAge': '1d',
        }),
        defineAuth({ session: { expiresIn: 60 } })
      );

      expect(session?.expiresIn).toBe(60);
      expect(session?.updateAge).toBe(24 * 60 * 60);
    });
  });

  describe('rate limit storage', () => {
    it('is the database in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      expect(buildAuthOptions(fakeStrapi()).rateLimit?.storage).toBe('database');
    });

    it('is memory everywhere else', () => {
      for (const env of ['development', 'test', '']) {
        vi.stubEnv('NODE_ENV', env);

        expect(buildAuthOptions(fakeStrapi()).rateLimit?.storage, env).toBe('memory');
      }
    });

    it('follows the config', () => {
      vi.stubEnv('NODE_ENV', 'production');

      expect(
        buildAuthOptions(fakeStrapi({ 'plugin::end-users.rateLimit.storage': 'memory' })).rateLimit
          ?.storage
      ).toBe('memory');

      vi.stubEnv('NODE_ENV', 'development');

      expect(
        buildAuthOptions(fakeStrapi({ 'plugin::end-users.rateLimit.storage': 'database' }))
          .rateLimit?.storage
      ).toBe('database');
    });

    it('refuses a store it does not provide', () => {
      expect(() =>
        buildAuthOptions(fakeStrapi({ 'plugin::end-users.rateLimit.storage': 'redis' }))
      ).toThrow(/rateLimit\.storage/);
    });
  });

  describe('rate limit', () => {
    it('is on in every environment by default', () => {
      for (const env of ['production', 'development', 'test', '']) {
        vi.stubEnv('NODE_ENV', env);

        expect(
          buildAuthOptions(fakeStrapi({ 'plugin::end-users.rateLimit.enabled': undefined }))
            .rateLimit?.enabled,
          env
        ).toBe(true);
      }
    });

    it("leaves window and max to Better Auth's own when they are not configured", () => {
      const { rateLimit } = buildAuthOptions(fakeStrapi({}));

      expect(rateLimit).not.toHaveProperty('window');
      expect(rateLimit).not.toHaveProperty('max');
      expect(rateLimit).not.toHaveProperty('customRules');
    });

    it('takes enabled, window, max and customRules from config', () => {
      const customRules = { '/sign-in/email': { window: 10, max: 3 } };
      const { rateLimit } = buildAuthOptions(
        fakeStrapi({
          'plugin::end-users.rateLimit.enabled': false,
          'plugin::end-users.rateLimit.window': 60,
          'plugin::end-users.rateLimit.max': 5,
          'plugin::end-users.rateLimit.customRules': customRules,
        })
      );

      expect(rateLimit).toMatchObject({ enabled: false, window: 60, max: 5, customRules });
    });
  });

  describe('base URL', () => {
    it('is the origin of the server URL Strapi was configured with', () => {
      expect(
        buildAuthOptions(fakeStrapi({ 'server.url': 'https://api.example.com' })).baseURL
      ).toBe('https://api.example.com');
      expect(
        buildAuthOptions(fakeStrapi({ 'server.url': 'https://api.example.com/strapi/' })).baseURL
      ).toBe('https://api.example.com');
    });

    it('is the address Strapi derived from its host and port when it was given no URL', () => {
      expect(buildAuthOptions(fakeStrapi()).baseURL).toBe(SERVER_URL);
      expect(buildAuthOptions(fakeStrapi({ 'server.url': '' })).baseURL).toBe(SERVER_URL);
      expect(buildAuthOptions(fakeStrapi({ 'server.url': '/strapi' })).baseURL).toBe(SERVER_URL);
    });

    it('is never left to the request: without any address the engine does not start', () => {
      const none = { 'server.url': undefined, 'server.absoluteUrl': undefined };

      expect(() => buildAuthOptions(fakeStrapi(none))).toThrow(/server\.url/);
      expect(() => createEngine(fakeStrapi(none), defineAuth({}))).toThrow(/server\.url/);
    });

    it('warns in production when the project did not set the server URL', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const unset = fakeStrapi();
      createEngine(unset, defineAuth({}));

      expect(unset.log.warn).toHaveBeenCalledWith(expect.stringMatching(/server\.url is not set/));

      const set = fakeStrapi({ 'server.url': 'https://api.example.com' });
      createEngine(set, defineAuth({}));

      expect(set.log.warn).not.toHaveBeenCalled();
    });

    it('cannot be changed by the project, even without defineAuth', () => {
      const forged = {
        kind: 'end-users:auth',
        options: { baseURL: 'https://evil.example' },
      } as unknown as ReturnType<typeof defineAuth>;

      expect(buildAuthOptions(fakeStrapi(), forged).baseURL).toBe(SERVER_URL);
    });
  });

  describe('project options', () => {
    it('win over the plugin ones', () => {
      const options = buildAuthOptions(
        fakeStrapi(),
        defineAuth({ session: { expiresIn: 60 }, emailAndPassword: { enabled: false } })
      );

      expect(options.session?.expiresIn).toBe(60);
      expect(options.emailAndPassword?.enabled).toBe(false);
    });

    it('are merged into groups, not swapped for them', () => {
      const sendResetPassword = sender();
      const options = buildAuthOptions(
        fakeStrapi(),
        defineAuth({
          advanced: { useSecureCookies: true },
          emailAndPassword: { sendResetPassword },
        })
      );

      expect(options.advanced?.cookiePrefix).toBe('strapi');
      expect(options.advanced?.database?.generateId).toBe(false);
      expect(options.advanced?.useSecureCookies).toBe(true);
      expect(options.emailAndPassword?.enabled).toBe(true);
      expect(options.emailAndPassword?.password?.verify).toBeTypeOf('function');
      expect(options.emailAndPassword?.sendResetPassword).toBe(sendResetPassword);
    });

    it('cannot replace the secret, the database or the base path, even without defineAuth', () => {
      const forged = {
        kind: 'end-users:auth',
        options: { secret: 'forged', basePath: '/forged', database: {} },
      } as unknown as ReturnType<typeof defineAuth>;
      const options = buildAuthOptions(fakeStrapi(), forged);

      expect(options.secret).toBe(SECRET);
      expect(options.basePath).toBe('/api/auth');
      expect(options.database).toBeTypeOf('function');
    });

    it('cannot rename the locked tables and attributes, even without defineAuth', () => {
      const forged = {
        kind: 'end-users:auth',
        options: {
          user: { fields: { email: 'mail' }, modelName: 'People', changeEmail: { enabled: true } },
          session: { fields: { token: 'secret' }, modelName: 'Logins', expiresIn: 60 },
          account: { fields: { password: 'pw' }, modelName: 'Links' },
          verification: { fields: { value: 'v' }, modelName: 'Proofs' },
        },
      } as unknown as ReturnType<typeof defineAuth>;
      const options = buildAuthOptions(fakeStrapi(), forged);

      for (const group of ['user', 'session', 'account', 'verification'] as const) {
        expect(options[group], group).not.toHaveProperty('fields');
        expect(options[group], group).not.toHaveProperty('modelName');
      }

      // what else the groups said still counts
      expect(options.user?.changeEmail?.enabled).toBe(true);
      expect(options.session?.expiresIn).toBe(60);

      const schema = createEngine(fakeStrapi(), forged).schema();

      expect(schema.find((table) => table.name === 'user')?.fields.email.fieldName).toBe('email');
      expect(schema.map((table) => table.name)).not.toContain('People');
    });

    it('cannot hash identifiers, rename the rate limit table or add secondary storage, even without defineAuth', () => {
      const secondaryStorage = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
      const forged = {
        kind: 'end-users:auth',
        options: {
          verification: { storeIdentifier: 'hashed', disableCleanup: true },
          rateLimit: { modelName: 'limits', fields: { key: 'k' }, window: 30 },
          secondaryStorage,
        },
      } as unknown as ReturnType<typeof defineAuth>;
      const options = buildAuthOptions(fakeStrapi(), forged);

      expect(options.verification).not.toHaveProperty('storeIdentifier');
      expect(options.rateLimit).not.toHaveProperty('modelName');
      expect(options.rateLimit).not.toHaveProperty('fields');
      expect(options.secondaryStorage).toBeUndefined();

      // what else the groups said still counts
      expect(options.verification?.disableCleanup).toBe(true);
      expect(options.rateLimit?.window).toBe(30);
    });

    it('drops secondary storage whatever else the project says, even without defineAuth', () => {
      const secondaryStorage = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };

      for (const extra of [
        {},
        { verification: { storeInDatabase: true } },
        { verification: { storeInDatabase: true }, session: { storeSessionInDatabase: true } },
      ]) {
        const forged = {
          kind: 'end-users:auth',
          options: { secondaryStorage, ...extra },
        } as unknown as ReturnType<typeof defineAuth>;

        expect(buildAuthOptions(fakeStrapi(), forged).secondaryStorage).toBeUndefined();
      }
    });

    it('keeps the rate limit store the plugin chose when the project asks for secondary storage', () => {
      const forged = {
        kind: 'end-users:auth',
        options: { rateLimit: { storage: 'secondary-storage', window: 30 } },
      } as unknown as ReturnType<typeof defineAuth>;
      const options = buildAuthOptions(fakeStrapi(), forged);

      expect(options.rateLimit?.storage).toBe('memory');
      expect(options.rateLimit?.window).toBe(30);
    });

    it('turns telemetry off, and a project cannot turn it on, even without defineAuth', () => {
      expect(buildAuthOptions(fakeStrapi()).telemetry).toEqual({ enabled: false });

      const forged = {
        kind: 'end-users:auth',
        options: { telemetry: { enabled: true, debug: true } },
      } as unknown as ReturnType<typeof defineAuth>;

      expect(buildAuthOptions(fakeStrapi(), forged).telemetry).toEqual({ enabled: false });
    });

    it('ignore keys that would rewrite a prototype', () => {
      const forged = JSON.parse(
        '{"kind":"end-users:auth","options":{"advanced":{"__proto__":{"polluted":true}}}}'
      );

      buildAuthOptions(fakeStrapi(), forged);

      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });
});

describe('loadProjectAuth', () => {
  /** What Strapi hands the plugin: the project's values over the plugin's defaults. */
  const mergedWithDefaults = (user: Record<string, unknown>) =>
    defaultsDeep(
      {},
      user,
      (pluginConfig.default as (args: { env: unknown }) => Record<string, unknown>)({
        env: Object.assign(() => undefined, { bool: () => false }),
      })
    );

  it('is undefined when the plugin config has no auth', () => {
    expect(loadProjectAuth(fakeStrapi({}))).toBeUndefined();
    expect(loadProjectAuth(fakeStrapi({ 'plugin::end-users.auth': null }))).toBeUndefined();
  });

  it('reads the auth options from the plugin config', () => {
    const auth = defineAuth({ session: { expiresIn: 60 } });

    expect(loadProjectAuth(fakeStrapi({ 'plugin::end-users.auth': auth }))).toBe(auth);
  });

  it('refuses an auth value that is not a defineAuth() result, naming config/plugins.ts', () => {
    expect(() =>
      loadProjectAuth(fakeStrapi({ 'plugin::end-users.auth': { plugins: [] } }))
    ).toThrow(/config\/plugins\.ts.*defineAuth/);
  });

  it('no longer reads src/auth.ts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'end-users-auth-'));

    try {
      writeFileSync(
        join(dir, 'auth.js'),
        `module.exports = { kind: 'end-users:auth', options: { session: { expiresIn: 60 } } };`
      );

      expect(loadProjectAuth(fakeStrapi({}, dir))).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps Better Auth plugin objects intact through the plugin config', () => {
    const sendMagicLink = vi.fn();
    const plugin = magicLink({ sendMagicLink });
    const [endpoint] = Object.values(plugin.endpoints ?? {});
    const merged = mergedWithDefaults({ auth: defineAuth({ plugins: [plugin] }) });

    const loaded = loadProjectAuth(fakeStrapi({ 'plugin::end-users.auth': merged.auth }));
    const [loadedPlugin] = (loaded?.options.plugins ?? []) as BetterAuthPlugin[];

    expect(loadedPlugin.id).toBe(plugin.id);
    expect(Object.values(loadedPlugin.endpoints ?? {})[0]).toBe(endpoint);
  });

  it('loads a config/plugins.ts that also has a named auth export', () => {
    const dir = mkdtempSync(join(tmpdir(), 'end-users-auth-'));

    try {
      const file = join(dir, 'plugins.js');

      writeFileSync(
        file,
        `const auth = { kind: 'end-users:auth', options: { session: { expiresIn: 60 } } };
Object.defineProperty(exports, '__esModule', { value: true });
exports.auth = auth;
exports.default = () => ({ 'end-users': { config: { auth } } });`
      );

      const plugins = importDefault(file)({ env: () => undefined });
      const merged = mergedWithDefaults(plugins['end-users'].config);

      expect(
        loadProjectAuth(fakeStrapi({ 'plugin::end-users.auth': merged.auth }))?.options
      ).toEqual({ session: { expiresIn: 60 } });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('createEngine', () => {
  let engine: AuthEngine;
  let sendResetPassword: ReturnType<typeof sender>;
  let sendVerificationEmail: ReturnType<typeof sender>;

  beforeEach(() => {
    store.db = emptyDatabase();

    sendResetPassword = sender();
    sendVerificationEmail = sender();

    engine = createEngine(
      fakeStrapi({ 'server.absoluteUrl': SERVER_URL }),
      defineAuth({
        emailAndPassword: { sendResetPassword },
        emailVerification: { sendVerificationEmail },
        // Cookie cache on, to prove the engine does not trust it
        session: { cookieCache: { enabled: true, maxAge: 300 } },
        plugins: [
          {
            id: 'project-plugin',
            endpoints: {
              ping: createAuthEndpoint('/project/ping', { method: 'GET' }, async (ctx) =>
                ctx.json({ pong: true })
              ),
            },
            schema: { note: { fields: { text: { type: 'string' } } } },
          },
        ],
      })
    );
  });

  describe('handle', () => {
    it('answers the health endpoint', async () => {
      const res = await engine.handle(new Request(`${SERVER_URL}/api/auth/ok`));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it('serves the endpoints of the project plugins', async () => {
      const res = await engine.handle(new Request(`${SERVER_URL}/api/auth/project/ping`));

      expect(await res.json()).toEqual({ pong: true });
    });

    it('signs up, names the cookie with the strapi prefix and answers with a Bearer token', async () => {
      const res = await engine.handle(
        json('/sign-up/email', { email: 'Alice@Example.com', password: PASSWORD, name: 'Alice' })
      );

      expect(res.status).toBe(200);
      expect(res.headers.getSetCookie().join(';')).toContain('strapi.session_token=');
      expect(res.headers.get('set-auth-token')).toBeTruthy();
    });

    it('answers a two-factor user’s password sign-in with a second-factor challenge, not a token', async () => {
      const { userId, email } = await signUp(engine);

      rowsOf('twoFactor').push({ id: 'tf', userId, secret: 's', backupCodes: 'b' });
      (
        rowsOf('user').find((row) => row.id === userId) as Record<string, unknown>
      ).twoFactorEnabled = true;
      rowsOf('session').splice(0);

      const res = await signIn(engine, email, PASSWORD);

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ twoFactorRedirect: true });
      // bearer would otherwise hand out the token of the session two-factor has just deleted
      expect(res.headers.get('set-auth-token')).toBeNull();
      // the only session cookie is the one that clears it
      expect(res.headers.getSetCookie().join(';')).not.toMatch(/strapi\.session_token=[^;]/);
      expect(rowsOf('session')).toHaveLength(0);
    });

    it('signs in with the password it stored', async () => {
      const { email } = await signUp(engine);

      expect((await signIn(engine, email, PASSWORD)).status).toBe(200);
      expect((await signIn(engine, email, 'wrong-password')).status).toBe(401);
    });
  });

  describe('the origin check, under NODE_ENV=test', () => {
    const TRUSTED = 'https://app.example.com';
    const UNTRUSTED = 'https://evil.example.com';
    let trusting: AuthEngine;

    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'test');

      trusting = createEngine(
        fakeStrapi({
          'server.absoluteUrl': SERVER_URL,
          'plugin::end-users.trustedOrigins': [TRUSTED],
        })
      );
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    const signOut = (cookie: string, headers: Record<string, string> = {}) =>
      trusting.handle(json('/sign-out', {}, { cookie, ...headers }));

    it('refuses a request with the session cookie from an origin that is not trusted', async () => {
      const { cookie } = await signUp(trusting);

      const res = await signOut(cookie, { origin: UNTRUSTED });

      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: 'INVALID_ORIGIN' });
      expect(rowsOf('session')).toHaveLength(1);
    });

    it('refuses it from an untrusted referer, and with neither origin nor referer', async () => {
      const { cookie } = await signUp(trusting);

      expect((await signOut(cookie, { referer: `${UNTRUSTED}/page` })).status).toBe(403);
      expect((await signOut(cookie)).status).toBe(403);
      expect(rowsOf('session')).toHaveLength(1);
    });

    it('accepts it from a trusted origin, and from the server itself', async () => {
      const first = await signUp(trusting, 'one@x.io');
      const second = await signUp(trusting, 'two@x.io');

      expect((await signOut(first.cookie, { origin: TRUSTED })).status).toBe(200);
      expect((await signOut(second.cookie, { origin: SERVER_URL })).status).toBe(200);
      expect(rowsOf('session')).toHaveLength(0);
    });

    it('refuses a sign-in from an untrusted origin, and accepts it from a trusted one', async () => {
      const { email } = await signUp(trusting);
      const signInFrom = (origin: string) =>
        trusting.handle(json('/sign-in/email', { email, password: PASSWORD }, { origin }));

      expect((await signInFrom(UNTRUSTED)).status).toBe(403);
      expect((await signInFrom(TRUSTED)).status).toBe(200);
    });

    it('is not what answers a Bearer request, which carries no cookie', async () => {
      const { signed } = await signUp(trusting);

      const res = await trusting.handle(
        json('/sign-out', {}, { authorization: `Bearer ${signed}`, origin: UNTRUSTED })
      );

      expect(res.status).toBe(200);
    });
  });

  describe('the email of a request (strapi-normalize)', () => {
    it('signs up an address with spaces and capitals as its normal form', async () => {
      const res = await engine.handle(
        json('/sign-up/email', {
          email: ' Alice@Example.com ',
          password: PASSWORD,
          name: 'Alice',
        })
      );

      expect(res.status).toBe(200);
      expect(((await res.json()) as { user: { email: string } }).user.email).toBe(
        'alice@example.com'
      );
      expect(rowsOf('user').map((row) => row.email)).toEqual(['alice@example.com']);
    });

    it('signs in with the address spelled any way', async () => {
      await signUp(engine, 'bob@example.com');

      for (const email of ['bob@example.com', ' Bob@Example.com', 'BOB@EXAMPLE.COM\t']) {
        expect((await signIn(engine, email, PASSWORD)).status, email).toBe(200);
      }
    });

    it('applies to every endpoint that takes an address, the reset request included', async () => {
      await signUp(engine, 'carol@example.com');

      const res = await engine.handle(
        json('/request-password-reset', {
          email: '  Carol@Example.com ',
          redirectTo: 'http://localhost:1337/reset',
        })
      );

      expect(res.status).toBe(200);
      expect(sendResetPassword).toHaveBeenCalledTimes(1);
      expect(sendResetPassword.mock.calls[0][0].user.email).toBe('carol@example.com');
    });

    it('keeps the rest of the body as it was', async () => {
      const res = await engine.handle(
        json('/sign-up/email', { email: ' D@Example.com', password: PASSWORD, name: ' Dee  ' })
      );

      expect(((await res.json()) as { user: { name: string } }).user.name).toBe(' Dee  ');
    });

    it('leaves a value that is not a string for Better Auth to refuse', async () => {
      const res = await engine.handle(
        json('/sign-up/email', { email: 42, password: PASSWORD, name: 'X' })
      );

      expect(res.status).toBe(400);
      expect(rowsOf('user')).toHaveLength(0);
    });

    it('still refuses an address that is not one', async () => {
      const res = await engine.handle(
        json('/sign-up/email', { email: ' not an email ', password: PASSWORD, name: 'X' })
      );

      expect(res.status).toBe(400);
    });

    it('leaves a request without a body alone', async () => {
      const res = await engine.handle(new Request(`${SERVER_URL}/api/auth/get-session`));

      expect(res.status).toBe(200);
    });
  });

  describe('requests that come through the Koa bridge', () => {
    const viaKoa = (path: string, type: string, body: Record<string, unknown>) =>
      engine.handle(
        toFetchRequest(
          koaCtx({
            method: 'POST',
            url: `/api/auth${path}`,
            headers: { 'content-type': type },
            body,
          }),
          SERVER_URL
        )
      );

    const signUpWithUsername = async () => {
      const res = await engine.handle(
        json('/sign-up/email', {
          email: 'alice@x.io',
          password: PASSWORD,
          name: 'Alice',
          username: 'alice',
        })
      );

      expect(res.status).toBe(200);
    };

    it('answers 415 to a multipart post to an endpoint that only takes JSON: no login CSRF', async () => {
      await signUpWithUsername();

      const res = await viaKoa('/sign-in/username', 'multipart/form-data; boundary=----x', {
        username: 'alice',
        password: PASSWORD,
      });

      expect(res.status).toBe(415);
      expect(res.headers.getSetCookie().join(';')).not.toContain('session_token=');
      expect(rowsOf('session')).toHaveLength(1);
    });

    it('answers 415 to any other type Better Auth does not take', async () => {
      await signUpWithUsername();

      for (const type of ['application/vnd.api+json', 'application/csp-report', 'text/plain']) {
        const res = await viaKoa('/sign-in/username', type, {
          username: 'alice',
          password: PASSWORD,
        });

        expect(res.status, type).toBe(415);
      }
    });

    it('still takes JSON', async () => {
      await signUpWithUsername();

      const res = await viaKoa('/sign-in/username', 'application/json', {
        username: 'alice',
        password: PASSWORD,
      });

      expect(res.status).toBe(200);
    });

    it('still takes the form post of the sign-in endpoints that accept one', async () => {
      await signUpWithUsername();

      const res = await viaKoa('/sign-in/email', 'application/x-www-form-urlencoded', {
        email: 'alice@x.io',
        password: PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('set-auth-token')).toBeTruthy();
    });
  });

  describe('schema', () => {
    it('lists the tables of the engine and of the plugins, as engine tables', () => {
      const tables = engine.schema();
      const names = tables.map((table) => table.name);

      expect(names).toEqual(
        expect.arrayContaining(['user', 'session', 'account', 'verification', 'twoFactor', 'note'])
      );

      const user = tables.find((table) => table.name === 'user');

      // fields added by the username, two-factor and admin plugins
      expect(Object.keys(user?.fields ?? {})).toEqual(
        expect.arrayContaining(['email', 'username', 'twoFactorEnabled', 'banned', 'banExpires'])
      );
    });

    it('has a rate limit table while the limits live in memory too: the lockout counters are kept there', () => {
      const inMemory = createEngine(
        fakeStrapi({ 'plugin::end-users.rateLimit.storage': 'memory' }),
        defineAuth({})
      );

      expect(inMemory.schema().map((table) => table.name)).toContain('rateLimit');
    });

    it('has a rate limit table when the limits live in the database', () => {
      const withDatabase = createEngine(
        fakeStrapi({ 'plugin::end-users.rateLimit.storage': 'database' }),
        defineAuth({})
      );

      expect(withDatabase.schema().map((table) => table.name)).toContain('rateLimit');
    });
  });

  describe('the default user fields', () => {
    it('adds preferredLocale and lastSignInAt to the user table', () => {
      const user = engine.schema().find((table) => table.name === 'user');

      expect(user?.fields).toMatchObject({
        preferredLocale: { type: 'string', required: false },
        lastSignInAt: { type: 'date', required: false },
      });
    });

    it('sets lastSignInAt on sign-in, and on a session the plugin creates', async () => {
      const { userId } = await signUp(engine);
      const lastSignInAt = () => rowsOf('user').find((row) => row.id === userId)?.lastSignInAt;

      // Signing up opens a session
      expect(lastSignInAt()).toBeInstanceOf(Date);

      rowsOf('user').find((row) => row.id === userId)!.lastSignInAt = null;

      expect((await signIn(engine, 'a@x.io', PASSWORD)).status).toBe(200);
      expect(lastSignInAt()).toBeInstanceOf(Date);

      rowsOf('user').find((row) => row.id === userId)!.lastSignInAt = null;
      await engine.createSession(userId, {});

      expect(lastSignInAt()).toBeInstanceOf(Date);
    });

    it('does not fail a sign-in when the date cannot be written', async () => {
      const { email } = await signUp(engine);
      const original = rowsOf('user');

      // A user table that refuses the field: the write throws, the sign-in goes on
      Object.defineProperty(original[0], 'lastSignInAt', {
        configurable: true,
        get: () => null,
        set() {
          throw new Error('column is read only');
        },
      });

      expect((await signIn(engine, email, PASSWORD)).status).toBe(200);
    });

    it('lets the user set preferredLocale through /update-user and refuses lastSignInAt', async () => {
      const { cookie, userId } = await signUp(engine);
      const update = (body: Record<string, unknown>) =>
        engine.handle(json('/update-user', body, { cookie, origin: SERVER_URL }));

      expect((await update({ preferredLocale: 'fr' })).status).toBe(200);
      expect(rowsOf('user').find((row) => row.id === userId)?.preferredLocale).toBe('fr');

      const before = rowsOf('user').find((row) => row.id === userId)?.lastSignInAt;
      const refused = await update({ lastSignInAt: '2000-01-01T00:00:00.000Z' });

      expect(refused.status).toBe(400);
      expect(rowsOf('user').find((row) => row.id === userId)?.lastSignInAt).toEqual(before);
    });

    it('still refuses a project additionalFields, and keeps the plugin`s own with a project`s hooks', () => {
      expect(() =>
        // @ts-expect-error the type refuses it too
        defineAuth({ user: { additionalFields: { credits: { type: 'number' } } } })
      ).toThrow(/profile/);

      // A result that did not come from `defineAuth` is stripped, not trusted
      const forged = {
        kind: 'end-users:auth',
        options: { user: { additionalFields: { credits: { type: 'number' } } } },
      } as unknown as ReturnType<typeof defineAuth>;
      const fields = createEngine(fakeStrapi(), forged)
        .schema()
        .find((table) => table.name === 'user')?.fields;

      expect(fields).toHaveProperty('preferredLocale');
      expect(fields).not.toHaveProperty('credits');
    });

    it('sets lastSignInAt when the project has its own session hook', async () => {
      const after = vi.fn(async () => {});
      const hooked = createEngine(
        fakeStrapi(),
        defineAuth({ databaseHooks: { session: { create: { after } } } })
      );
      const { userId } = await signUp(hooked, 'hooked@x.io');

      expect(after).toHaveBeenCalled();
      expect(rowsOf('user').find((row) => row.id === userId)?.lastSignInAt).toBeInstanceOf(Date);
    });
  });

  describe('getSession', () => {
    it('reads the session cookie', async () => {
      const { userId, cookie, token } = await signUp(engine);
      const session = await engine.getSession(new Headers({ cookie }));

      expect(session).toMatchObject({
        userId,
        token,
        ipAddress: '203.0.113.9',
        userAgent: 'vitest',
        impersonatedBy: null,
      });
      expect(session?.id).toEqual(expect.any(String));
      expect(session?.expiresAt).toBeInstanceOf(Date);
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.updatedAt).toBeInstanceOf(Date);
    });

    it('reads a Bearer token, signed or raw', async () => {
      const { userId, signed, token } = await signUp(engine);

      expect((await engine.getSession(bearer(signed)))?.userId).toBe(userId);
      expect((await engine.getSession(bearer(token)))?.userId).toBe(userId);
    });

    it('is null without a session, with a bad cookie and with a bad token', async () => {
      await signUp(engine);

      expect(await engine.getSession(new Headers())).toBeNull();
      expect(
        await engine.getSession(new Headers({ cookie: 'strapi.session_token=nope' }))
      ).toBeNull();
      expect(await engine.getSession(bearer('nope'))).toBeNull();
    });

    it('is null for a session that has expired', async () => {
      const { signed } = await signUp(engine);
      rowsOf('session')[0].expiresAt = new Date(Date.now() - 1000);

      expect(await engine.getSession(bearer(signed))).toBeNull();
    });

    it('does not honour the cookie cache: a revoked session is gone at once', async () => {
      const res = await engine.handle(
        json('/sign-up/email', { email: 'cache@x.io', password: PASSWORD, name: 'C' })
      );
      const cookies = res.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; ');
      const { user } = (await res.json()) as { user: { id: string } };

      // the cache cookie is really there, so this test can fail
      expect(cookies).toContain('strapi.session_data=');
      expect(await engine.getSession(new Headers({ cookie: cookies }))).not.toBeNull();

      await engine.revokeSessions(user.id);

      expect(await engine.getSession(new Headers({ cookie: cookies }))).toBeNull();
    });
  });

  describe('lookupSession', () => {
    const DAY = 24 * 60 * 60 * 1000;

    /** Every cookie the sign-up set, as a browser sends them back: the token and the cache. */
    const browserCookies = async (email: string) => {
      const res = await engine.handle(
        json('/sign-up/email', { email, password: PASSWORD, name: 'B' })
      );
      const { user } = (await res.json()) as { user: { id: string } };

      return {
        userId: user.id,
        cookies: res.headers
          .getSetCookie()
          .map((cookie) => cookie.split(';')[0])
          .join('; '),
      };
    };

    /** Every `Set-Cookie` value removes its cookie. */
    const allClearing = (cookies: string[]) =>
      cookies.every((cookie) => /;\s*Max-Age=0(;|$)/i.test(cookie));

    it('finds the session, says it came from the cookie, and sets no cookie', async () => {
      const { userId, cookie } = await signUp(engine);
      const lookup = await engine.lookupSession(new Headers({ cookie }));

      expect(lookup.session?.userId).toBe(userId);
      expect(lookup.credentials).toBe(true);
      expect(lookup.source).toBe('cookie');
      expect(lookup.setCookies).toEqual([]);
    });

    it('says a session found from a Bearer token came from it', async () => {
      const { userId, signed } = await signUp(engine);
      const lookup = await engine.lookupSession(bearer(signed));

      expect(lookup.session?.userId).toBe(userId);
      expect(lookup.source).toBe('bearer');
    });

    it('says a bare request carries no credentials', async () => {
      await signUp(engine);

      expect(await engine.lookupSession(new Headers())).toEqual({
        session: null,
        credentials: false,
        source: null,
        setCookies: [],
      });
    });

    it('does not count a cookie of another name, or an empty session cookie, as credentials', async () => {
      await signUp(engine);

      for (const cookie of [
        '_ga=GA1.2; theme=dark',
        'strapi.session_token=',
        'x_strapi.session_token=a',
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const lookup = await engine.lookupSession(new Headers({ cookie }));

        expect(lookup.credentials, cookie).toBe(false);
        expect(lookup.source, cookie).toBeNull();
      }
    });

    it('says a cookie or a token that names no session was still credentials', async () => {
      await signUp(engine);

      const badCookie = await engine.lookupSession(
        new Headers({ cookie: '_ga=1; strapi.session_token=nope; theme=dark' })
      );
      const badToken = await engine.lookupSession(bearer('nope'));

      expect(badCookie).toEqual({
        session: null,
        credentials: true,
        source: 'cookie',
        setCookies: [],
      });
      expect(badToken).toEqual({
        session: null,
        credentials: true,
        source: 'bearer',
        setCookies: [],
      });
    });

    describe('a Bearer header sent with a session cookie', () => {
      it('is refused when the token fails its signature check, however good the cookie', async () => {
        const { cookies, userId } = await browserCookies('cookie-user@x.io');

        // the cookie on its own is a session, so this test can fail
        expect((await engine.lookupSession(new Headers({ cookie: cookies }))).session?.userId).toBe(
          userId
        );

        for (const authorization of ['Bearer a.b', 'Bearer forged.c2lnbmF0dXJl']) {
          // eslint-disable-next-line no-await-in-loop
          const lookup = await engine.lookupSession(
            new Headers({ cookie: cookies, authorization })
          );

          expect(lookup, authorization).toEqual({
            session: null,
            credentials: true,
            source: 'bearer',
            setCookies: [],
          });
        }
      });

      it('is the Bearer user, not the cookie user, when both are good', async () => {
        const alice = await signUp(engine, 'alice@x.io');
        const bob = await browserCookies('bob@x.io');

        const lookup = await engine.lookupSession(
          new Headers({ cookie: bob.cookies, authorization: `Bearer ${alice.signed}` })
        );

        expect(lookup.session?.userId).toBe(alice.userId);
        expect(lookup.source).toBe('bearer');
      });

      it('is refused when the token is empty: the cookie does not answer for it', async () => {
        const { cookies } = await browserCookies('empty-bearer@x.io');

        // Headers trims `Bearer ` to `Bearer`, as Node does with the header of a real request
        for (const authorization of ['Bearer ', 'Bearer', 'bearer   ']) {
          // eslint-disable-next-line no-await-in-loop
          const lookup = await engine.lookupSession(
            new Headers({ cookie: cookies, authorization })
          );

          expect(lookup, JSON.stringify(authorization)).toEqual({
            session: null,
            credentials: true,
            source: 'bearer',
            setCookies: [],
          });
        }
      });

      it('is refused when the token is written in a way the engine does not read', async () => {
        const alice = await signUp(engine, 'tab@x.io');
        const { cookies } = await browserCookies('tab-cookie@x.io');

        const lookup = await engine.lookupSession(
          new Headers({ cookie: cookies, authorization: `Bearer\t${alice.signed}` })
        );

        expect(lookup).toMatchObject({ session: null, credentials: true, source: 'bearer' });
      });

      it('takes the scheme in any case', async () => {
        const { signed, userId } = await signUp(engine);

        for (const scheme of ['bearer', 'BEARER', 'BeArEr']) {
          // eslint-disable-next-line no-await-in-loop
          const lookup = await engine.lookupSession(
            new Headers({ authorization: `${scheme} ${signed}` })
          );

          expect(lookup.session?.userId, scheme).toBe(userId);
          expect(lookup.source, scheme).toBe('bearer');
        }
      });

      it('is not a Bearer header when the scheme is another one: the cookie answers', async () => {
        const { cookies, userId } = await browserCookies('basic@x.io');

        for (const authorization of ['Basic dXNlcjpwYXNz', 'Bearerx abc']) {
          // eslint-disable-next-line no-await-in-loop
          const lookup = await engine.lookupSession(
            new Headers({ cookie: cookies, authorization })
          );

          expect(lookup.session?.userId, authorization).toBe(userId);
          expect(lookup.source, authorization).toBe('cookie');
        }
      });
    });

    describe('a session cookie that names a session that is gone', () => {
      it('is cleared when the session has expired: the engine hands over the clearing cookies', async () => {
        const { cookie } = await signUp(engine);
        rowsOf('session')[0].expiresAt = new Date(Date.now() - 1000);

        const lookup = await engine.lookupSession(new Headers({ cookie }));

        expect(lookup).toMatchObject({ session: null, credentials: true, source: 'cookie' });
        expect(lookup.setCookies.some((value) => value.startsWith('strapi.session_token=;'))).toBe(
          true
        );
        expect(allClearing(lookup.setCookies)).toBe(true);
      });

      it('is cleared when the session was revoked', async () => {
        const { cookies, userId } = await browserCookies('revoked@x.io');

        await engine.revokeSessions(userId);

        const lookup = await engine.lookupSession(new Headers({ cookie: cookies }));

        expect(lookup).toMatchObject({ session: null, source: 'cookie' });
        expect(lookup.setCookies.some((value) => value.startsWith('strapi.session_token=;'))).toBe(
          true
        );
        expect(allClearing(lookup.setCookies)).toBe(true);
      });

      it('gets no cookie for a Bearer token whose session is gone', async () => {
        const { signed, userId } = await signUp(engine);

        await engine.revokeSessions(userId);

        expect(await engine.lookupSession(bearer(signed))).toEqual({
          session: null,
          credentials: true,
          source: 'bearer',
          setCookies: [],
        });
      });
    });

    it('hands over the fresh cookie when it extends the session', async () => {
      const { cookie, signed } = await signUp(engine);

      // Due for an extension: older than the update age (a day), well inside its lifetime
      const dueAt = Date.now() + 5 * DAY;
      rowsOf('session')[0].expiresAt = new Date(dueAt);

      const lookup = await engine.lookupSession(new Headers({ cookie }));
      const sessionCookie = lookup.setCookies.find((value) =>
        value.startsWith('strapi.session_token=')
      );
      const extendedTo = (rowsOf('session')[0].expiresAt as Date).getTime();

      expect(extendedTo).toBeGreaterThan(dueAt);
      expect(lookup.session?.expiresAt.getTime()).toBe(extendedTo);
      // The same token, as the cookie writes it (percent-encoded)
      expect(sessionCookie).toContain(`strapi.session_token=${encodeURIComponent(signed)}`);
      expect(sessionCookie).toMatch(/Max-Age=\d+/i);
      expect(sessionCookie).toMatch(/HttpOnly/i);
    });

    it('does the same for a Bearer token, and getSession still answers the session alone', async () => {
      const { signed, userId } = await signUp(engine);
      rowsOf('session')[0].expiresAt = new Date(Date.now() + 5 * DAY);

      const lookup = await engine.lookupSession(bearer(signed));

      expect(lookup.session?.userId).toBe(userId);
      expect(lookup.setCookies.length).toBeGreaterThan(0);
      expect((await engine.getSession(bearer(signed)))?.userId).toBe(userId);
    });

    it('sets nothing for a session that was not due for an extension', async () => {
      const { cookie } = await signUp(engine);
      const before = (rowsOf('session')[0].expiresAt as Date).getTime();

      const lookup = await engine.lookupSession(new Headers({ cookie }));

      expect((rowsOf('session')[0].expiresAt as Date).getTime()).toBe(before);
      expect(lookup.setCookies).toEqual([]);
    });

    it('clears the cookie of a session that could not be extended because it went in between', async () => {
      // Every session update is refused, as when the row is deleted between read and write:
      // Better Auth clears the cookie and answers 401
      const failing = createEngine(
        fakeStrapi({ 'server.absoluteUrl': SERVER_URL }),
        defineAuth({ databaseHooks: { session: { update: { before: async () => false } } } })
      );
      const { cookie } = await signUp(failing);
      rowsOf('session')[0].expiresAt = new Date(Date.now() + 5 * DAY);

      const lookup = await failing.lookupSession(new Headers({ cookie }));

      expect(lookup).toMatchObject({ session: null, credentials: true, source: 'cookie' });
      expect(lookup.setCookies.some((value) => value.startsWith('strapi.session_token=;'))).toBe(
        true
      );
      expect(allClearing(lookup.setCookies)).toBe(true);
    });
  });

  describe('isTrustedOrigin', () => {
    const TRUSTED = 'https://app.example.com';
    const PREVIEWS = 'https://*.preview.example.com';
    let trusting: AuthEngine;

    beforeEach(() => {
      trusting = createEngine(
        fakeStrapi({
          'server.absoluteUrl': SERVER_URL,
          'plugin::end-users.trustedOrigins': [TRUSTED, PREVIEWS],
        })
      );
    });

    it('trusts a configured origin, one a wildcard pattern matches, and the server itself', async () => {
      for (const origin of [
        TRUSTED,
        'https://pr-12.preview.example.com',
        SERVER_URL,
        // a Referer: a URL with a path, read as its origin
        `${TRUSTED}/settings/profile?tab=1`,
      ]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await trusting.isTrustedOrigin(origin), origin).toBe(true);
      }
    });

    it('trusts nothing else', async () => {
      for (const origin of [
        'https://evil.example.com',
        'http://app.example.com',
        'https://app.example.com.evil.example',
        'https://preview.example.com.evil.example',
        'null',
        '',
        '/a/relative/path',
        'not a url',
      ]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await trusting.isTrustedOrigin(origin), origin).toBe(false);
      }
    });

    it("agrees with the engine's own origin check on its endpoints", async () => {
      const origins = [
        TRUSTED,
        'https://pr-7.preview.example.com',
        SERVER_URL,
        'https://evil.example.com',
        'https://a.b.preview.example.com.evil.example',
        'http://app.example.com',
      ];

      for (const [index, origin] of origins.entries()) {
        // eslint-disable-next-line no-await-in-loop
        const { cookie } = await signUp(trusting, `parity-${index}@x.io`);
        // eslint-disable-next-line no-await-in-loop
        const res = await trusting.handle(json('/sign-out', {}, { cookie, origin }));
        // eslint-disable-next-line no-await-in-loop
        const trusted = await trusting.isTrustedOrigin(origin);

        expect(trusted, origin).toBe(res.status === 200);
      }
    });
  });

  describe('createSession', () => {
    it('signs a user in without a credential and records where from', async () => {
      const { userId } = await signUp(engine);
      const session = await engine.createSession(userId, {
        ipAddress: '198.51.100.1',
        userAgent: 'legacy-client',
      });

      expect(session).toMatchObject({
        userId,
        ipAddress: '198.51.100.1',
        userAgent: 'legacy-client',
      });
      expect(session.token).toEqual(expect.any(String));
      expect((await engine.getSession(bearer(session.token)))?.id).toBe(session.id);
    });

    it('works without request details', async () => {
      const { userId } = await signUp(engine);
      const session = await engine.createSession(userId, {});

      expect(session.userId).toBe(userId);
    });

    it('refuses a user that does not exist', async () => {
      await expect(engine.createSession('missing', {})).rejects.toMatchObject({
        name: 'NotFoundError',
      });
    });

    it('refuses a banned user: nothing in the admin plugin does it outside a request', async () => {
      const { userId } = await signUp(engine);
      await engine.ban(userId, 'spam');

      await expect(engine.createSession(userId, {})).rejects.toMatchObject({
        name: 'ForbiddenError',
        details: { code: 'USER_BANNED' },
      });
      expect(rowsOf('session')).toHaveLength(0);
    });

    it('lifts a ban that has run out and signs the user in', async () => {
      const { userId } = await signUp(engine);
      await engine.ban(userId, 'spam', new Date(Date.now() - 1000));

      const session = await engine.createSession(userId, {});

      expect(session.userId).toBe(userId);
      expect(rowsOf('user')[0]).toMatchObject({ banned: false, banExpires: null, banReason: null });
    });

    it('keeps a ban whose end cannot be read: the user is refused and stays banned', async () => {
      const { userId } = await signUp(engine);
      await engine.ban(userId, 'spam');
      rowsOf('user')[0].banExpires = 'not a date';

      await expect(engine.createSession(userId, {})).rejects.toMatchObject({
        details: { code: 'USER_BANNED' },
      });
      expect(rowsOf('user')[0]).toMatchObject({ banned: true });
    });
  });

  describe('listSessions and revokeSessions', () => {
    it('lists the active sessions of a user and not another one', async () => {
      const a = await signUp(engine, 'a@x.io');
      await signUp(engine, 'b@x.io');
      await engine.createSession(a.userId, {});
      rowsOf('session').push({
        id: 'old',
        userId: a.userId,
        token: 'old-token',
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const sessions = await engine.listSessions(a.userId);

      expect(sessions).toHaveLength(2);
      expect(sessions.every((session) => session.userId === a.userId)).toBe(true);
      expect(sessions.map((session) => session.id)).not.toContain('old');
    });

    it('signs the user out everywhere', async () => {
      const a = await signUp(engine, 'a@x.io');
      const b = await signUp(engine, 'b@x.io');
      await engine.createSession(a.userId, {});

      await engine.revokeSessions(a.userId);

      expect(await engine.listSessions(a.userId)).toEqual([]);
      expect(await engine.getSession(bearer(a.signed))).toBeNull();
      expect(await engine.getSession(bearer(b.signed))).not.toBeNull();
    });

    it('signs the user out everywhere but the session named', async () => {
      const a = await signUp(engine);
      const keep = await engine.createSession(a.userId, {});
      await engine.createSession(a.userId, {});

      await engine.revokeSessions(a.userId, { except: keep.id });

      const left = await engine.listSessions(a.userId);

      expect(left.map((session) => session.id)).toEqual([keep.id]);
    });

    it('signs out the sessions of one device and no other, with the compatibility mode on', async () => {
      const compat = createEngine(
        fakeStrapi({ 'plugin::end-users.compat.usersPermissions': true }),
        defineAuth({})
      );
      const a = await signUp(compat, 'a@x.io');
      const b = await signUp(compat, 'b@x.io');
      const phone = await compat.createSession(a.userId, { deviceId: 'phone' });
      const laptop = await compat.createSession(a.userId, { deviceId: 'laptop' });
      const theirs = await compat.createSession(b.userId, { deviceId: 'phone' });

      expect(phone.deviceId).toBe('phone');
      // The sign-up's own session was given a device of its own
      expect((await compat.listSessions(a.userId)).every((session) => session.deviceId)).toBe(true);

      await compat.revokeDevice(a.userId, 'phone');

      const left = (await compat.listSessions(a.userId)).map((session) => session.id);

      expect(left).not.toContain(phone.id);
      expect(left).toContain(laptop.id);
      expect((await compat.listSessions(b.userId)).map((session) => session.id)).toContain(
        theirs.id
      );
    });

    it('has no device on a session when the compatibility mode is off', async () => {
      const a = await signUp(engine, 'a@x.io');
      const session = await engine.createSession(a.userId, { deviceId: 'phone' });

      expect(session.deviceId).toBeNull();
    });

    it('revokes one session of the user, by its token', async () => {
      const a = await signUp(engine, 'a@x.io');
      const keep = await engine.createSession(a.userId, {});
      const drop = await engine.createSession(a.userId, {});

      await engine.revokeSession(a.userId, drop.id);

      expect((await engine.listSessions(a.userId)).map((session) => session.id)).not.toContain(
        drop.id
      );
      expect((await engine.listSessions(a.userId)).map((session) => session.id)).toContain(keep.id);
    });

    it('refuses to revoke a session that belongs to another user, and deletes nothing', async () => {
      const a = await signUp(engine, 'a@x.io');
      const b = await signUp(engine, 'b@x.io');
      const foreign = await engine.createSession(b.userId, {});
      const before = rowsOf('session').length;

      await expect(engine.revokeSession(a.userId, foreign.id)).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
      await expect(engine.revokeSession(a.userId, 'no-such-id')).rejects.toBeInstanceOf(
        errors.NotFoundError
      );

      expect(rowsOf('session')).toHaveLength(before);
    });

    it('does nothing for a user without sessions', async () => {
      await expect(engine.revokeSessions('nobody')).resolves.toBeUndefined();
      await expect(engine.revokeSessions('nobody', { except: 'x' })).resolves.toBeUndefined();
    });
  });

  describe('listAccounts and unlinkAccount', () => {
    const linkGithub = async (userId: string) => {
      rowsOf('account').push({
        id: `github-${userId}`,
        userId,
        providerId: 'github',
        accountId: 'gh-1',
        accessToken: 'secret-access',
        scope: 'read:user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return `github-${userId}`;
    };

    it('lists the linked sign-in methods without a secret in them', async () => {
      const { userId } = await signUp(engine);
      await linkGithub(userId);

      const accounts = await engine.listAccounts(userId);

      expect(accounts.map((account) => account.providerId).sort()).toEqual([
        'credential',
        'github',
      ]);

      for (const account of accounts) {
        expect(Object.keys(account).sort()).toEqual(
          ['accountId', 'createdAt', 'id', 'providerId', 'scope', 'updatedAt', 'userId'].sort()
        );
      }

      expect(accounts.find((account) => account.providerId === 'github')?.scope).toBe('read:user');
      expect(JSON.stringify(accounts)).not.toContain('secret-access');
    });

    it('unlinks one of several', async () => {
      const { userId } = await signUp(engine);
      const githubId = await linkGithub(userId);

      await engine.unlinkAccount(userId, githubId);

      expect((await engine.listAccounts(userId)).map((account) => account.providerId)).toEqual([
        'credential',
      ]);
    });

    it('refuses the last one', async () => {
      const { userId } = await signUp(engine);
      const [only] = await engine.listAccounts(userId);

      await expect(engine.unlinkAccount(userId, only.id)).rejects.toThrow(/last/);
      expect(await engine.listAccounts(userId)).toHaveLength(1);
    });

    it('refuses an account that is not the user’s', async () => {
      const a = await signUp(engine, 'a@x.io');
      const b = await signUp(engine, 'b@x.io');
      await linkGithub(a.userId);
      const githubOfB = await linkGithub(b.userId);

      await expect(engine.unlinkAccount(a.userId, githubOfB)).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      expect(await engine.listAccounts(b.userId)).toHaveLength(2);
    });

    it('refuses an account that does not exist', async () => {
      const { userId } = await signUp(engine);
      await linkGithub(userId);

      await expect(engine.unlinkAccount(userId, 'missing')).rejects.toMatchObject({
        name: 'NotFoundError',
      });
    });
  });

  describe('passwords', () => {
    it('hashes and verifies', async () => {
      const hash = await engine.hashPassword('correct horse battery');

      expect(hash).not.toContain('correct horse');
      await expect(engine.verifyPassword(hash, 'correct horse battery')).resolves.toBe(true);
      await expect(engine.verifyPassword(hash, 'wrong horse battery')).resolves.toBe(false);
    });

    it('does not use the same hash twice', async () => {
      expect(await engine.hashPassword('same-password')).not.toBe(
        await engine.hashPassword('same-password')
      );
    });

    it('verifies a bcrypt hash, for migrated users', async () => {
      const legacy = await bcrypt.hash('legacy-pass', 4);

      await expect(engine.verifyPassword(legacy, 'legacy-pass')).resolves.toBe(true);
      await expect(engine.verifyPassword(legacy, 'other-pass')).resolves.toBe(false);
    });

    it('lets a migrated user sign in with the bcrypt hash they came with', async () => {
      const { userId, email } = await signUp(engine);
      rowsOf('account')[0].password = await bcrypt.hash('legacy-pass', 4);

      expect((await signIn(engine, email, 'legacy-pass')).status).toBe(200);
      expect((await signIn(engine, email, PASSWORD)).status).toBe(401);
      expect(userId).toBeTruthy();
    });

    it('says no, not an error, to a hash it cannot read', async () => {
      await expect(engine.verifyPassword('not-a-hash', 'x')).resolves.toBe(false);
      await expect(engine.verifyPassword('', 'x')).resolves.toBe(false);
    });

    it('replaces the password of a user who has one', async () => {
      const { userId, email } = await signUp(engine);

      await engine.setPassword(userId, 'brand-new-password');

      expect((await signIn(engine, email, 'brand-new-password')).status).toBe(200);
      expect((await signIn(engine, email, PASSWORD)).status).toBe(401);
      expect(await engine.listAccounts(userId)).toHaveLength(1);
    });

    it('creates the credential account for a user who has none', async () => {
      const { userId, email } = await signUp(engine);
      rowsOf('account').splice(0);

      await engine.setPassword(userId, 'brand-new-password');

      const accounts = await engine.listAccounts(userId);

      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatchObject({ providerId: 'credential', accountId: userId, userId });
      expect((await signIn(engine, email, 'brand-new-password')).status).toBe(200);
    });

    it('holds a new password to the length limits of the engine', async () => {
      const { userId } = await signUp(engine);

      await expect(engine.setPassword(userId, 'short')).rejects.toMatchObject({
        name: 'ValidationError',
      });
      await expect(engine.setPassword(userId, 'x'.repeat(129))).rejects.toMatchObject({
        name: 'ValidationError',
      });
    });

    it('refuses a user that does not exist', async () => {
      await expect(engine.setPassword('missing', 'brand-new-password')).rejects.toMatchObject({
        name: 'NotFoundError',
      });
    });
  });

  describe('emails', () => {
    it('sends a password reset through the configured sender, with a link to this server', async () => {
      const { email } = await signUp(engine);

      await engine.sendPasswordReset(email, 'http://localhost:1337/reset');

      expect(sendResetPassword).toHaveBeenCalledTimes(1);

      const [{ user, url, token }] = sendResetPassword.mock.calls[0];

      expect(user.email).toBe(email);
      expect(url).toMatch(new RegExp(`^${SERVER_URL}/api/auth/reset-password/${token}`));
      expect(url).toContain(encodeURIComponent('http://localhost:1337/reset'));
    });

    it('refuses a redirect to a site Better Auth does not trust, whatever NODE_ENV skips', async () => {
      const { email } = await signUp(engine);

      await expect(
        engine.sendPasswordReset(email, 'https://evil.example.com/reset')
      ).rejects.toMatchObject({ name: 'ForbiddenError' });
      expect(sendResetPassword).not.toHaveBeenCalled();

      await engine.sendPasswordReset(email, `${SERVER_URL}/reset`);

      expect(sendResetPassword).toHaveBeenCalledTimes(1);
    });

    it('sends the reset and verification emails through the email templates when the project sets no sender', async () => {
      const sendTemplate = vi.fn<TemplateSender>().mockResolvedValue(undefined);
      const strapi = {
        ...fakeStrapi(),
        plugin: () => ({
          service: () => ({
            get: async () => ({
              signUp: { enabled: true, requireEmailVerification: false },
              redirects: { emailVerified: null, passwordReset: null, error: null },
              passwords: { minLength: 8, maxLength: 128, requireMixedClasses: false },
            }),
            sendTemplate,
          }),
        }),
      } as unknown as Core.Strapi;
      const bare = createEngine(strapi, defineAuth({}));
      const { userId, email } = await signUp(bare);

      sendTemplate.mockClear();
      await bare.sendPasswordReset(email, `${SERVER_URL}/reset`);
      await bare.sendVerificationEmail(userId, `${SERVER_URL}/verified`);

      expect(sendTemplate.mock.calls.map((call) => call[0])).toEqual([
        'end-users.reset-password',
        'end-users.verify-email',
      ]);
    });

    describe('with a forged Host header', () => {
      const forge = (email: string) =>
        new Request('https://evil.example/api/auth/request-password-reset', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            host: 'evil.example',
            'x-forwarded-host': 'evil.example',
            'x-forwarded-proto': 'https',
          },
          body: JSON.stringify({ email, redirectTo: `${SERVER_URL}/reset` }),
        });

      it('still builds the reset link on the configured origin', async () => {
        const { email } = await signUp(engine);

        expect((await engine.handle(forge(email))).status).toBe(200);

        const [{ url }] = sendResetPassword.mock.calls[0];

        expect(url.startsWith(`${SERVER_URL}/api/auth/reset-password/`)).toBe(true);
        expect(url).not.toContain('evil.example');
      });

      it('and also when proxy headers are trusted', async () => {
        const trusting = createEngine(
          fakeStrapi(),
          defineAuth({
            advanced: { trustedProxyHeaders: true },
            emailAndPassword: { sendResetPassword },
          })
        );
        const { email } = await signUp(trusting);

        expect((await trusting.handle(forge(email))).status).toBe(200);

        const [{ url }] = sendResetPassword.mock.calls[0];

        expect(url.startsWith(`${SERVER_URL}/api/auth/reset-password/`)).toBe(true);
      });
    });

    it('does not tell whether the address is known', async () => {
      await expect(
        engine.sendPasswordReset('nobody@x.io', 'http://localhost:1337/reset')
      ).resolves.toBeUndefined();
      expect(sendResetPassword).not.toHaveBeenCalled();
    });

    it('sends a verification email to the user', async () => {
      const { userId, email } = await signUp(engine);

      await engine.sendVerificationEmail(userId, 'http://localhost:1337/verified');

      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

      const [{ user, url }] = sendVerificationEmail.mock.calls[0];

      expect(user.email).toBe(email);
      expect(url.startsWith(`${SERVER_URL}/api/auth/verify-email`)).toBe(true);
    });

    it('refuses a user that does not exist', async () => {
      await expect(
        engine.sendVerificationEmail('missing', 'http://localhost:1337/verified')
      ).rejects.toMatchObject({ name: 'NotFoundError' });
    });
  });

  describe('emails sent by the engine itself, with rate limiting on', () => {
    // Nothing in these calls has a client address, so if they went through Better Auth's router
    // they would all share one rate-limit bucket (and a captcha would refuse them). The user signs
    // up through the plain engine: sign-up is itself limited and captcha-protected here.
    let limited: AuthEngine;
    let sendReset: ReturnType<typeof sender>;
    let sendVerify: ReturnType<typeof sender>;

    beforeEach(() => {
      sendReset = sender();
      sendVerify = sender();
      limited = createEngine(
        fakeStrapi({ 'plugin::end-users.trustedOrigins': ['https://app.example.com'] }),
        defineAuth({
          rateLimit: { enabled: true },
          emailAndPassword: { sendResetPassword: sendReset },
          emailVerification: { sendVerificationEmail: sendVerify },
          plugins: [captcha({ provider: 'cloudflare-turnstile', secretKey: 'secret' })],
        })
      );
    });

    it('is a real limit: the same calls over HTTP are refused after three', async () => {
      const { email } = await signUp(engine);
      const plain = createEngine(
        fakeStrapi(),
        defineAuth({ rateLimit: { enabled: true }, emailAndPassword: { sendResetPassword } })
      );
      const statuses: number[] = [];

      for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        statuses.push((await plain.handle(json('/request-password-reset', { email }))).status);
      }

      expect(statuses).toEqual([200, 200, 200, 429]);
    });

    it('sends four password resets in a row', async () => {
      const { email } = await signUp(engine);

      for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await limited.sendPasswordReset(email, `${SERVER_URL}/reset`);
      }

      expect(sendReset).toHaveBeenCalledTimes(4);
    });

    it('sends four verification emails in a row', async () => {
      const { userId } = await signUp(engine);

      for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await limited.sendVerificationEmail(userId, `${SERVER_URL}/verified`);
      }

      expect(sendVerify).toHaveBeenCalledTimes(4);
    });

    it('is not refused by the captcha the project turned on, which guards the HTTP route', async () => {
      const { email, userId } = await signUp(engine);

      // the in-memory rate limiter is shared by every engine in this process: a client of its own
      const http = await limited.handle(
        json('/request-password-reset', { email }, { 'x-forwarded-for': '198.51.100.77' })
      );

      expect(http.status).toBe(400);
      expect(sendReset).not.toHaveBeenCalled();

      await limited.sendPasswordReset(email, `${SERVER_URL}/reset`);
      await limited.sendVerificationEmail(userId, `${SERVER_URL}/verified`);

      expect(sendReset).toHaveBeenCalledTimes(1);
      expect(sendVerify).toHaveBeenCalledTimes(1);
    });

    it('builds the link on the configured origin', async () => {
      const { email } = await signUp(engine);

      await limited.sendPasswordReset(email, `${SERVER_URL}/reset`);

      const [{ url }] = sendReset.mock.calls[0];

      expect(url.startsWith(`${SERVER_URL}/api/auth/reset-password/`)).toBe(true);
    });

    describe('where the link may send the user', () => {
      it('accepts this server, a trusted origin and a path', async () => {
        const { email, userId } = await signUp(engine);

        for (const to of [`${SERVER_URL}/reset`, 'https://app.example.com/reset', '/reset']) {
          // eslint-disable-next-line no-await-in-loop
          await limited.sendPasswordReset(email, to);
          // eslint-disable-next-line no-await-in-loop
          await limited.sendVerificationEmail(userId, to);
        }

        expect(sendReset).toHaveBeenCalledTimes(3);
        expect(sendVerify).toHaveBeenCalledTimes(3);
      });

      it('refuses any other site, before anything is sent', async () => {
        const { email, userId } = await signUp(engine);

        for (const to of [
          'https://evil.example.com/reset',
          'https://app.example.com.evil.example/reset',
          '//evil.example.com/reset',
        ]) {
          // eslint-disable-next-line no-await-in-loop
          await expect(limited.sendPasswordReset(email, to), to).rejects.toMatchObject({
            name: 'ForbiddenError',
            details: { code: 'INVALID_REDIRECT_URL' },
          });
          // eslint-disable-next-line no-await-in-loop
          await expect(limited.sendVerificationEmail(userId, to), to).rejects.toMatchObject({
            name: 'ForbiddenError',
          });
        }

        expect(sendReset).not.toHaveBeenCalled();
        expect(sendVerify).not.toHaveBeenCalled();
      });
    });
  });

  describe('resetTwoFactor', () => {
    it('removes the secret and turns two-factor off', async () => {
      const a = await signUp(engine, 'a@x.io');
      const b = await signUp(engine, 'b@x.io');

      for (const { userId } of [a, b]) {
        rowsOf('twoFactor').push({ id: `tf-${userId}`, userId, secret: 's', backupCodes: 'b' });
        const user = rowsOf('user').find((row) => row.id === userId) as Record<string, unknown>;
        user.twoFactorEnabled = true;
      }

      await engine.resetTwoFactor(a.userId);

      expect(rowsOf('twoFactor').map((row) => row.userId)).toEqual([b.userId]);
      expect(rowsOf('user').find((row) => row.id === a.userId)?.twoFactorEnabled).toBe(false);
      expect(rowsOf('user').find((row) => row.id === b.userId)?.twoFactorEnabled).toBe(true);
    });

    it('forgets the devices the user trusted, so none skips the second factor after re-enrolment', async () => {
      const a = await signUp(engine, 'a@x.io');
      const b = await signUp(engine, 'b@x.io');
      const later = new Date(Date.now() + 3600_000);

      // what Better Auth stores for a trusted device: identifier `trust-device-…`, value the user id
      rowsOf('verification').push(
        { id: 'trust-a', identifier: 'trust-device-aaa', value: a.userId, expiresAt: later },
        { id: 'trust-a2', identifier: 'trust-device-bbb', value: a.userId, expiresAt: later },
        { id: 'trust-b', identifier: 'trust-device-ccc', value: b.userId, expiresAt: later },
        // not a trusted device, though it is the same user's
        { id: 'reset-a', identifier: 'reset-password:tok', value: a.userId, expiresAt: later }
      );

      await engine.resetTwoFactor(a.userId);

      expect(rowsOf('verification').map((row) => row.id)).toEqual(['trust-b', 'reset-a']);
    });

    it('signs the user out everywhere, and nobody else', async () => {
      const a = await signUp(engine, 'a@x.io');
      const b = await signUp(engine, 'b@x.io');

      await engine.resetTwoFactor(a.userId);

      expect(await engine.listSessions(a.userId)).toEqual([]);
      expect(await engine.getSession(bearer(a.signed))).toBeNull();
      expect(await engine.getSession(bearer(b.signed))).not.toBeNull();
    });

    it('is fine for a user without two-factor', async () => {
      const { userId } = await signUp(engine);

      await expect(engine.resetTwoFactor(userId)).resolves.toBeUndefined();
    });
  });

  describe('ban and unban', () => {
    it('bans, with the reason and the end date, and signs the user out', async () => {
      const { userId, signed } = await signUp(engine);
      const until = new Date(Date.now() + 3600_000);

      await engine.ban(userId, 'spam', until);

      expect(rowsOf('user')[0]).toMatchObject({
        banned: true,
        banReason: 'spam',
        banExpires: until,
      });
      expect(await engine.listSessions(userId)).toEqual([]);
      expect(await engine.getSession(bearer(signed))).toBeNull();
    });

    it('bans without a reason or an end date', async () => {
      const { userId } = await signUp(engine);

      await engine.ban(userId);

      expect(rowsOf('user')[0]).toMatchObject({ banned: true, banReason: null, banExpires: null });
    });

    it('keeps a banned user from signing in', async () => {
      const { userId, email } = await signUp(engine);
      await engine.ban(userId, 'spam');

      const res = await signIn(engine, email, PASSWORD);

      expect(res.status).toBe(403);
      expect(((await res.json()) as { code: string }).code).toBe('BANNED_USER');
    });

    it('lets an unbanned user sign in again', async () => {
      const { userId, email } = await signUp(engine);
      await engine.ban(userId, 'spam', new Date(Date.now() + 3600_000));

      await engine.unban(userId);

      expect(rowsOf('user')[0]).toMatchObject({ banned: false, banReason: null, banExpires: null });
      expect((await signIn(engine, email, PASSWORD)).status).toBe(200);
    });

    it('refuses a user that does not exist', async () => {
      await expect(engine.ban('missing', 'spam')).rejects.toMatchObject({ name: 'NotFoundError' });
      await expect(engine.unban('missing')).rejects.toMatchObject({ name: 'NotFoundError' });
    });
  });

  describe('reload', () => {
    const inputs = (overrides: Partial<StartupInputs> = {}): StartupInputs => ({
      ...emptyStartupInputs(),
      ...overrides,
    });

    it('swaps to an instance built from the new options', async () => {
      const { email } = await signUp(engine);
      const signIn = () => engine.handle(json('/sign-in/email', { email, password: PASSWORD }));

      expect((await signIn()).status).toBe(200);

      await engine.reload(inputs({ requireEmailVerification: true }));

      // The new instance refuses an unverified email, which the first was not told to do
      expect((await signIn()).status).toBe(403);
    });

    it('answers a getSession that starts while it reloads', async () => {
      const { signed } = await signUp(engine);

      const reloading = engine.reload(inputs({ requireEmailVerification: true }));
      const session = await engine.getSession(bearer(signed));

      await reloading;

      expect(session).not.toBeNull();
      expect(await engine.getSession(bearer(signed))).not.toBeNull();
    });

    it('keeps the old instance when the new context rejects', async () => {
      // A plugin that initialises once and fails the next time, which is what a bad provider does
      let builds = 0;
      const fragile = createEngine(
        fakeStrapi({ 'server.absoluteUrl': SERVER_URL }),
        defineAuth({
          plugins: [
            {
              id: 'fragile',
              init() {
                builds += 1;

                if (builds > 1) {
                  throw new Error('provider X is misconfigured');
                }
              },
            },
          ],
        })
      );
      const { email } = await signUp(fragile);

      await expect(fragile.reload(inputs())).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringContaining('provider X is misconfigured'),
      });
      await expect(fragile.reload(inputs())).rejects.toBeInstanceOf(errors.ValidationError);

      const res = await fragile.handle(json('/sign-in/email', { email, password: PASSWORD }));

      expect(res.status).toBe(200);
    });

    describe('a provider whose discovery document never answers', () => {
      let silent: Server;
      let discoveryUrl = '';

      beforeAll(async () => {
        // Accepts the connection and says nothing
        silent = createServer(() => undefined);

        await new Promise<void>((resolve) => {
          silent.listen(0, '127.0.0.1', resolve);
        });

        discoveryUrl = `http://127.0.0.1:${(silent.address() as AddressInfo).port}/.well-known/openid-configuration`;
      });

      afterAll(async () => {
        silent.closeAllConnections();
        await new Promise((resolve) => {
          silent.close(resolve);
        });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('fails the rebuild within the time budget, and the old instance keeps answering', async () => {
        const { email } = await signUp(engine);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        const settled = vi.fn();
        const rebuild = engine
          .reload(
            inputs({
              providers: {
                ...emptyStartupInputs().providers,
                genericOAuth: [
                  {
                    providerId: 'stalled',
                    discoveryUrl,
                    clientId: 'id',
                    clientSecret: 'secret',
                    scopes: ['openid'],
                  },
                ],
              },
            })
          )
          .then(settled, (error: Error) => error);

        await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS - 1);
        expect(settled).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(2);

        const error = await rebuild;

        expect(error).toBeInstanceOf(errors.ValidationError);
        expect((error as Error).message).toMatch(/did not answer within 5 seconds/);

        vi.useRealTimers();

        const res = await engine.handle(json('/sign-in/email', { email, password: PASSWORD }));

        expect(res.status).toBe(200);
      });
    });

    it('never changes schema()', async () => {
      const names = () => engine.schema().map((table) => table.name);
      const before = names();

      await engine.reload(
        inputs({
          requireEmailVerification: true,
          providers: {
            socialProviders: { github: { clientId: 'id', clientSecret: 's' } },
            genericOAuth: [],
            trustedProviders: ['github'],
          },
        })
      );

      expect(names()).toEqual(before);
    });
  });

  describe('installedMethods', () => {
    it('lists only what the plugin chain holds', () => {
      expect(engine.installedMethods()).toEqual(['emailPassword', 'username', 'twoFactor']);
    });

    it('lists magic link only when the project added it', () => {
      const withLink = createEngine(
        fakeStrapi({ 'server.absoluteUrl': SERVER_URL }),
        defineAuth({ plugins: [magicLink({ sendMagicLink: vi.fn() })] })
      );

      expect(withLink.installedMethods()).toEqual([
        'emailPassword',
        'username',
        'twoFactor',
        'magicLink',
      ]);
    });
  });
});

describe('createEngine with the opt-in plugins', () => {
  beforeEach(() => {
    store.db = {
      ...emptyDatabase(),
      passkey: [],
    };
  });

  // @better-auth/passkey and better-auth each resolve a copy of @better-auth/core and better-call
  // in this workspace, so this is the one place that shows the two work together
  it('runs passkey, whose endpoints are built with its own copy of Better Auth core', async () => {
    const engine = createEngine(
      fakeStrapi({ 'server.absoluteUrl': SERVER_URL }),
      defineAuth({ plugins: [passkey()] })
    );
    const { signed } = await signUp(engine);

    expect(engine.schema().map((table) => table.name)).toContain('passkey');

    const anonymous = await engine.handle(
      new Request(`${SERVER_URL}/api/auth/passkey/generate-register-options`)
    );

    // Better Auth's own error handling recognises an error thrown from the plugin
    expect(anonymous.status).toBe(401);

    const signedIn = await engine.handle(
      new Request(`${SERVER_URL}/api/auth/passkey/generate-register-options`, {
        headers: { authorization: `Bearer ${signed}` },
      })
    );

    expect(signedIn.status).toBe(200);
    expect(await signedIn.json()).toMatchObject({ challenge: expect.any(String) });
  });

  it('runs a plugin imported from the public entry point', async () => {
    const sendMagicLink = vi.fn();
    const engine = createEngine(
      fakeStrapi({ 'server.absoluteUrl': SERVER_URL }),
      defineAuth({ plugins: [magicLink({ sendMagicLink })] })
    );

    const res = await engine.handle(json('/sign-in/magic-link', { email: 'm@x.io' }));

    expect(res.status).toBe(200);
    expect(sendMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'm@x.io',
        url: expect.stringContaining('/magic-link/verify'),
      }),
      expect.anything()
    );
  });
});

describe('createEngine without a project auth', () => {
  it('loads the auth option from the plugin config when it is not handed one', async () => {
    store.db = emptyDatabase();

    const auth = defineAuth({
      plugins: [
        { id: 'from-config', schema: { fileNote: { fields: { text: { type: 'string' } } } } },
      ],
    });
    const engine = createEngine(fakeStrapi({ 'plugin::end-users.auth': auth }));

    expect(engine.schema().map((table) => table.name)).toContain('fileNote');
  });
});

describe('the experimental auth options warning', () => {
  const warned = (strapi: Core.Strapi) =>
    (strapi.log.warn as ReturnType<typeof vi.fn>).mock.calls.map(([message]) => String(message));

  beforeEach(() => {
    store.db = emptyDatabase();
  });

  it('warns once at start, naming the auth options the plugin does not model as experimental', () => {
    const strapi = fakeStrapi();

    createEngine(
      strapi,
      defineAuth({
        socialProviders: { github: { clientId: 'x', clientSecret: 'y' } },
        hooks: {},
        databaseHooks: {},
        advanced: { useSecureCookies: true },
        emailVerification: { sendVerificationEmail: vi.fn(), expiresIn: 60 },
      })
    );

    const messages = warned(strapi).filter((message) => message.includes('experimental'));

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(
      /socialProviders, hooks, databaseHooks, advanced, emailVerification\.expiresIn/
    );
    expect(messages[0]).toContain('not supported');
  });

  it('says nothing for plugins and the email senders', () => {
    const strapi = fakeStrapi();

    createEngine(
      strapi,
      defineAuth({
        plugins: [magicLink({ sendMagicLink: vi.fn() })],
        emailVerification: { sendVerificationEmail: vi.fn() },
        emailAndPassword: { sendResetPassword: vi.fn() },
      })
    );

    expect(warned(strapi).filter((message) => message.includes('experimental'))).toEqual([]);
  });
});

describe('the email senders of the experimental warning', () => {
  it('counts change email as a supported sender, and warns about what else it sets', () => {
    const sender = vi.fn();

    expect(
      experimentalAuthOptions(
        defineAuth({ user: { changeEmail: { sendChangeEmailConfirmation: sender } } } as never)
      )
    ).toEqual([]);
    // Better Auth 1.7.14 has no such option: it is not a sender, so it is reported
    expect(
      experimentalAuthOptions(
        defineAuth({ user: { changeEmail: { sendChangeEmailVerification: sender } } } as never)
      )
    ).toEqual(['user.changeEmail.sendChangeEmailVerification']);
    expect(
      experimentalAuthOptions(
        defineAuth({
          user: { changeEmail: { sendChangeEmailConfirmation: sender, enabled: true } },
        } as never)
      )
    ).toEqual(['user.changeEmail.enabled']);
    expect(experimentalAuthOptions(defineAuth({ user: { deleteUser: {} } } as never))).toEqual([
      'user.deleteUser',
    ]);
  });
});

describe('telemetry', () => {
  // Better Auth sends nothing from a test environment (it fixes NODE_ENV when it is loaded), so
  // these cannot watch a request leave. They pin what stops one outside it: its own check is
  // `BETTER_AUTH_TELEMETRY || options.telemetry.enabled`, so the option alone cannot beat the
  // variable, which has to be turned off. (Checked against the built plugin outside vitest:
  // with the variable and an endpoint set, Better Auth reports; through createEngine it does not.)
  beforeEach(() => {
    store.db = emptyDatabase();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const flagIsOn = () => getBooleanEnvVar('BETTER_AUTH_TELEMETRY', false);

  it.each(['1', 'true', 'TRUE', 'yes', 'on'])(
    'turns BETTER_AUTH_TELEMETRY=%s off, and says so',
    (value) => {
      vi.stubEnv('BETTER_AUTH_TELEMETRY', value);

      expect(flagIsOn()).toBe(true);

      const strapi = fakeStrapi();
      createEngine(strapi, defineAuth({}));

      expect(flagIsOn()).toBe(false);
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/BETTER_AUTH_TELEMETRY/));
    }
  );

  it.each([undefined, '', '0', 'false'])('leaves BETTER_AUTH_TELEMETRY=%s alone', (value) => {
    vi.stubEnv('BETTER_AUTH_TELEMETRY', value);

    const strapi = fakeStrapi();
    createEngine(strapi, defineAuth({}));

    expect(flagIsOn()).toBe(false);
    expect(process.env.BETTER_AUTH_TELEMETRY).toBe(value);
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });
});

describe('the session cookie cache and revocation', () => {
  // Better Auth's own /get-session answers from a signed cookie while the cache lasts, so the
  // setting decides whether a revoked session stops working at once on the native endpoint.
  const revokedSessionSeenByNativeEndpoint = async (cookieCache: string | false) => {
    store.db = emptyDatabase();

    const engine = createEngine(
      fakeStrapi({ 'plugin::end-users.session.cookieCache': cookieCache }),
      defineAuth({})
    );
    const res = await engine.handle(
      json('/sign-up/email', { email: 'cache@x.io', password: PASSWORD, name: 'C' })
    );
    const cookie = res.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const { user } = (await res.json()) as { user: { id: string } };

    await engine.revokeSessions(user.id);

    const answer = await engine.handle(
      new Request(`${SERVER_URL}/api/auth/get-session`, { headers: { cookie } })
    );

    return { cookie, session: await answer.json() };
  };

  it('is off by default, so a revoked session is gone at once on the native endpoint too', async () => {
    const { cookie, session } = await revokedSessionSeenByNativeEndpoint(false);

    expect(cookie).not.toContain('strapi.session_data=');
    expect(session).toBeNull();
  });

  it('delays revocation by its duration when a project turns it on', async () => {
    const { cookie, session } = await revokedSessionSeenByNativeEndpoint('5m');

    expect(cookie).toContain('strapi.session_data=');
    expect(session).toMatchObject({ user: { email: 'cache@x.io' } });
  });
});
