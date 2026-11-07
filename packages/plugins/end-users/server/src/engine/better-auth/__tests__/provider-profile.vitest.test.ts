import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../../../constants';
import { createProfileMiddleware } from '../../../document-middlewares/create-profile';
import { BUILT_IN_PROVIDERS } from '../../../providers/built-in';
import type { ProviderDefinition } from '../../../providers/define-provider';
import type { ConfiguredProvider } from '../../../providers/registry';
import providerService from '../../../services/provider';
import type { AuthEngine } from '../../types';
import { providerProfile } from '../plugins/provider-profile';
import { emptyStartupInputs } from '../../startup-inputs';
import { createEngine } from '../create-engine';

/**
 * What a provider writes on sign-in: the user's fields, with the per-provider toggle
 * and the email guard, and the claims mapped onto the profile.
 *
 * The engine is the real one over Better Auth's in-memory adapter, signing users in through a
 * generic OAuth provider whose token and user info the test supplies. The provider service is the
 * real one over a fake store; the profile and the Document Service are fakes.
 */
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

const github = BUILT_IN_PROVIDERS.find(
  (definition) => definition.id === 'github'
) as ProviderDefinition;

const registryState: { configured: ConfiguredProvider[] } = { configured: [] };

vi.mock('../../../providers/registry', () => ({
  registry: () => ({
    available: () => [github],
    fromConfig: () => registryState.configured,
    get: (id: string) => (id === 'github' ? github : undefined),
    packageOf: () => null,
  }),
}));

const SERVER_URL = 'http://localhost:1337';
const SECRET = 'test-secret-at-least-32-characters-long';

/** The profile the fake database holds: `department` is a string, `age` an integer, the rest is not for a provider. */
const profileSchema = {
  uid: PROFILE_UID,
  kind: 'collectionType',
  attributes: {
    department: { type: 'string' },
    title: { type: 'string' },
    age: { type: 'integer' },
    joined: { type: 'datetime' },
    notes: { type: 'string', private: true },
    avatar: { type: 'media' },
    team: { type: 'relation', relation: 'manyToOne', target: 'api::team.team' },
    user: { type: 'relation', relation: 'oneToOne', target: USER_UID },
  },
};

interface Row {
  [key: string]: unknown;
}

const setup = (storedProvider?: Record<string, unknown>) => {
  const values = new Map<string, unknown>(
    storedProvider ? [['providers', { github: storedProvider }]] : []
  );
  const state: Record<string, unknown> = {};
  const events: string[] = [];
  const profiles: Row[] = [];
  const warn = vi.fn();
  const config: Record<string, unknown> = {
    'plugin::end-users.secret': SECRET,
    'plugin::end-users.rateLimit.enabled': false,
    'server.absoluteUrl': SERVER_URL,
    'server.url': SERVER_URL,
    'api.rest.prefix': '/api',
  };

  const validateEntityUpdate = vi.fn(async (_model: unknown, data: Row) => {
    // The profile refuses a department that is not a short word
    if (typeof data.department === 'string' && data.department.length > 10) {
      throw new Error('department must be at most 10 characters');
    }

    return data;
  });

  const documents = () => ({
    findFirst: vi.fn(async () => profiles[0] ?? null),
    update: vi.fn(async ({ documentId, data }: { documentId: string; data: Row }) => {
      events.push(`profile updated, sessions: ${(store.db.session ?? []).length}`);
      Object.assign(profiles.find((row) => row.documentId === documentId) as Row, data);
    }),
    create: vi.fn(async ({ data }: { data: Row }) => {
      const row = { documentId: `profile-${profiles.length + 1}`, ...data };

      events.push('profile created');
      profiles.push(row);

      return row;
    }),
  });

  let provider: ReturnType<typeof providerService>;

  const services = (): Record<string, unknown> => ({
    provider,
    engine: { reload: async () => undefined },
    settings: {
      get: async () => ({
        signUp: { enabled: true, requireEmailVerification: false },
        redirects: { emailVerified: null, passwordReset: null, error: null },
        lockout: { enabled: false, maxAttempts: 5, durationMinutes: 15 },
        passwords: { minLength: 8, maxLength: 128, requireMixedClasses: false },
      }),
    },
    // The email plugin's templates, which send nothing
    templates: { sendTemplate: vi.fn(async () => {}) },
  });

  const strapi = {
    config: { get: (key: string, fallback?: unknown) => (key in config ? config[key] : fallback) },
    dirs: { dist: { src: '/nonexistent/end-users/src' } },
    log: { warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() },
    requestContext: { get: () => ({ state }) },
    contentType: () => profileSchema,
    store: () => ({
      get: async ({ key }: { key: string }) => values.get(key) ?? null,
      async set({ key, value }: { key: string; value: unknown }) {
        values.set(key, structuredClone(value));
      },
      async delete({ key }: { key: string }) {
        values.delete(key);
      },
    }),
    service: () => ({ encrypt: (v: string) => `v1:${v}`, decrypt: (v: string) => v.slice(3) }),
    entityValidator: { validateEntityUpdate },
    documents,
    db: { transaction: async (run: () => Promise<unknown>) => run() },
    plugin: () => ({ service: (name: string) => services()[name] }),
  } as unknown as Core.Strapi;

  provider = providerService({ strapi });

  return { strapi, provider, state, events, profiles, warn, validateEntityUpdate, values };
};

/** What the identity provider says about the user right now. */
const identity: Row = {};

const providerConfig = (overrideUserInfo: boolean) => ({
  providerId: 'github',
  clientId: 'client',
  clientSecret: 'secret',
  authorizationUrl: 'https://idp.example.com/authorize',
  tokenUrl: 'https://idp.example.com/token',
  pkce: false,
  overrideUserInfo,
  getToken: async () => ({ accessToken: 'token' }),
  getUserInfo: async () => ({ ...identity }),
});

/** An engine with one generic OAuth provider; its service is the fake's. */
const engineFor = (strapi: Core.Strapi, overrideUserInfo = false): AuthEngine =>
  createEngine(strapi, undefined, {
    ...emptyStartupInputs(),
    providers: {
      socialProviders: {},
      genericOAuth: [providerConfig(overrideUserInfo)],
      trustedProviders: [],
    },
  });

const cookiesOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

/** What a browser does: ask where to go, come back from the issuer with a code. */
const signInThroughProvider = async (engine: AuthEngine) => {
  const start = await engine.handle(
    new Request(`${SERVER_URL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: SERVER_URL },
      body: JSON.stringify({
        provider: 'github',
        callbackURL: `${SERVER_URL}/done`,
        disableRedirect: true,
      }),
    })
  );
  if (start.status !== 200) {
    throw new Error(`start ${start.status} ${await start.text()}`);
  }
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get('state') as string;

  return engine.handle(
    new Request(`${SERVER_URL}/api/auth/callback/github?code=abc&state=${state}`, {
      headers: { cookie: cookiesOf(start) },
    })
  );
};

const users = () => store.db.user ?? [];

const emptyDatabase = () => {
  store.db = {
    user: [],
    session: [],
    account: [],
    verification: [],
    twoFactor: [],
    rateLimit: [],
  } as Record<string, Array<Row>>;
};

const person = (overrides: Row = {}): Row => ({
  id: 'subject-1',
  email: 'ada@example.com',
  emailVerified: true,
  name: 'Ada',
  image: 'https://img.example.com/ada.png',
  department: 'Research',
  ...overrides,
});

describe('what a provider writes on sign-in', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    // `@strapi/utils` reads the private attributes of a type from the global application
    vi.stubGlobal('strapi', { config: { get: (_key: string, fallback: unknown) => fallback } });
    emptyDatabase();
    registryState.configured = [];
    Object.keys(identity).forEach((key) => delete identity[key]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('the user', () => {
    it('never changes the email on an OAuth sign-in, even with update on each sign-in', async () => {
      const { strapi } = setup();
      const engine = engineFor(strapi, true);

      Object.assign(identity, person());
      expect((await signInThroughProvider(engine)).status).toBe(302);
      expect(users()).toHaveLength(1);

      // The provider now says another address, and calls it verified
      Object.assign(identity, person({ email: 'ada@elsewhere.com', emailVerified: true }));
      users()[0].emailVerified = false;
      expect((await signInThroughProvider(engine)).status).toBe(302);

      expect(users()).toHaveLength(1);
      expect(users()[0]).toMatchObject({ email: 'ada@example.com', emailVerified: false });
    });

    it('still verifies the same address the provider vouches for', async () => {
      const { strapi } = setup();
      const engine = engineFor(strapi, true);

      Object.assign(identity, person({ emailVerified: false }));
      await signInThroughProvider(engine);
      expect(users()[0]).toMatchObject({ emailVerified: false });

      Object.assign(identity, person({ emailVerified: true }));
      await signInThroughProvider(engine);

      expect(users()[0]).toMatchObject({ email: 'ada@example.com', emailVerified: true });
    });

    it('updates name and image on each sign-in only when the toggle is on', async () => {
      for (const [update, name] of [
        [false, 'Ada'],
        [true, 'Ada Lovelace'],
      ] as const) {
        emptyDatabase();

        const engine = engineFor(setup().strapi, update);

        Object.assign(identity, person());
        await signInThroughProvider(engine);

        Object.assign(
          identity,
          person({ name: 'Ada Lovelace', image: 'https://img.example.com/new.png' })
        );
        await signInThroughProvider(engine);

        expect(users()[0]).toMatchObject({
          email: 'ada@example.com',
          name,
          image: update ? 'https://img.example.com/new.png' : 'https://img.example.com/ada.png',
        });
      }
    });

    it('hands the toggle to Better Auth from the saved provider, off until it is set', async () => {
      const { provider } = setup();
      const options = async () => (await provider.options()).socialProviders.github;

      await provider.update('github', { clientId: 'id', clientSecret: 'secret' });
      expect(await options()).toMatchObject({ overrideUserInfoOnSignIn: false });

      await provider.update('github', { updateUserOnSignIn: true });
      expect(await options()).toMatchObject({ overrideUserInfoOnSignIn: true });
    });
  });

  describe('the profile', () => {
    const stored = (profileMapping: unknown[]) => ({
      enabled: true,
      clientId: 'id',
      clientSecret: 'v1:secret',
      scopes: [],
      trustForLinking: false,
      fields: {},
      profileMapping,
    });
    const signUpMapping = { attribute: 'department', claim: 'department', when: 'sign-up' };
    const everyMapping = { attribute: 'title', claim: 'job.title', when: 'every-sign-in' };

    it('records the provider’s claims for the request as Better Auth reads the user', async () => {
      const { strapi, state } = setup(stored([]));

      Object.assign(identity, person({ job: { title: 'Engineer' } }));
      await signInThroughProvider(engineFor(strapi));

      expect(state.endUsersProviderClaims).toMatchObject({
        providerId: 'github',
        profile: { email: 'ada@example.com', department: 'Research' },
      });
    });

    it('writes sign-up mappings with the profile, in the user’s transaction', async () => {
      const { strapi, state, events, profiles } = setup(stored([signUpMapping, everyMapping]));
      let inTransaction = false;

      (strapi.db as unknown as { transaction: unknown }).transaction = async (
        run: () => Promise<unknown>
      ) => {
        inTransaction = true;

        try {
          return await run();
        } finally {
          inTransaction = false;
        }
      };

      // What the provider wrapper leaves on the request; then Strapi makes the user
      state.endUsersProviderClaims = {
        providerId: 'github',
        profile: person({ job: { title: 'Engineer' } }),
      };

      await createProfileMiddleware(strapi)(
        { uid: USER_UID, action: 'create', params: {} } as never,
        (async () => {
          events.push(`user written (in transaction: ${inTransaction})`);

          return { documentId: 'user-1' };
        }) as never
      );

      expect(events).toEqual(['user written (in transaction: true)', 'profile created']);
      expect(profiles).toEqual([
        { documentId: 'profile-1', department: 'Research', user: { connect: ['user-1'] } },
      ]);
    });

    it('writes every-sign-in mappings after the session is created', async () => {
      const { strapi, events, profiles } = setup(stored([signUpMapping, everyMapping]));

      // The profile `create-profile` made with the user
      profiles.push({ documentId: 'profile-1' });
      Object.assign(identity, person({ job: { title: 'Engineer' } }));

      expect((await signInThroughProvider(engineFor(strapi))).status).toBe(302);

      expect(events).toEqual(['profile updated, sessions: 1']);
      // Only the every-sign-in row: the sign-up one was `create-profile`'s
      expect(profiles[0]).toEqual({ documentId: 'profile-1', title: 'Engineer' });
    });

    it('skips and logs a claim value the profile refuses, and the sign-in goes on', async () => {
      const { strapi, profiles, warn } = setup(
        stored([{ ...signUpMapping, when: 'every-sign-in' }, everyMapping])
      );

      profiles.push({ documentId: 'profile-1' });
      Object.assign(
        identity,
        person({ department: 'A department name too long', job: { title: 'CTO' } })
      );

      const res = await signInThroughProvider(engineFor(strapi));

      expect(res.status).toBe(302);
      expect(cookiesOf(res)).toContain('strapi.session_token=');
      expect(profiles[0]).toEqual({ documentId: 'profile-1', title: 'CTO' });

      const logged = warn.mock.calls.map(([line]) => String(line)).join('\n');

      expect(logged).toContain('"department"');
      expect(logged).not.toContain('A department name too long');
    });

    it('does not fail the sign-in when the profile cannot be written', async () => {
      const { strapi, provider, profiles, warn } = setup(stored([everyMapping]));

      profiles.push({ documentId: 'profile-1' });
      Object.assign(identity, person({ job: { title: 'CTO' } }));
      vi.spyOn(provider, 'profileValues').mockRejectedValue(new Error('database is down'));

      const res = await signInThroughProvider(engineFor(strapi));

      expect(res.status).toBe(302);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('database is down'));
    });
  });

  describe('mappedAttributes', () => {
    const stored = (enabled: boolean, profileMapping: unknown[]) => ({
      enabled,
      clientId: 'id',
      clientSecret: 'v1:secret',
      scopes: [],
      trustForLinking: false,
      fields: {},
      profileMapping,
    });
    const rows = [
      { attribute: 'department', claim: 'department', when: 'sign-up' },
      { attribute: 'title', claim: 'job.title', when: 'every-sign-in' },
      { attribute: 'title', claim: 'bio', when: 'sign-up' },
    ];

    it('names the profile attributes an enabled provider writes, once each', async () => {
      const { provider } = setup(stored(true, rows));

      expect(await provider.mappedAttributes()).toEqual([
        { id: 'github', name: 'GitHub', attributes: ['department', 'title'] },
      ]);
    });

    it('leaves out a disabled provider and one that maps nothing', async () => {
      expect(await setup(stored(false, rows)).provider.mappedAttributes()).toEqual([]);
      expect(await setup(stored(true, [])).provider.mappedAttributes()).toEqual([]);
    });
  });

  describe('the mapping a provider is saved with', () => {
    const save = (profileMapping: unknown[]) =>
      setup().provider.update('github', {
        clientId: 'id',
        clientSecret: 'secret',
        profileMapping,
      } as never);

    it('refuses a mapping row to a relation, user, a private field or an unfit type', async () => {
      const refused: Array<[unknown, string]> = [
        [{ attribute: 'team', claim: 'company', when: 'sign-up' }, 'relation'],
        [{ attribute: 'user', claim: 'company', when: 'sign-up' }, 'owner'],
        [{ attribute: 'avatar', claim: 'company', when: 'sign-up' }, 'media'],
        [{ attribute: 'notes', claim: 'company', when: 'sign-up' }, 'private'],
        [{ attribute: 'nothing', claim: 'company', when: 'sign-up' }, 'not an attribute'],
        // a string claim into an integer, a number claim into a string
        [{ attribute: 'age', claim: 'company', when: 'sign-up' }, 'does not fit'],
        [{ attribute: 'department', claim: 'public_repos', when: 'sign-up' }, 'does not fit'],
        [{ attribute: 'department', claim: 'company', when: 'sometimes' }, 'sign-up'],
      ];

      for (const [row, reason] of refused) {
        const error = await save([{ attribute: 'title', claim: 'bio', when: 'sign-up' }, row]).then(
          () => null,
          (thrown: Error & { name: string; details?: unknown }) => thrown
        );

        expect(error?.name).toBe('ValidationError');
        expect(error?.message).toContain('profileMapping[1]');
        expect(error?.message).toContain(reason);
      }
    });

    it('accepts rows that fit, a typed path among them, and returns them', async () => {
      const rows = [
        { attribute: 'department', claim: 'company', when: 'sign-up' },
        { attribute: 'age', claim: 'public_repos', when: 'every-sign-in' },
        { attribute: 'title', claim: 'job.title', when: 'every-sign-in' },
      ];
      const saved = await save(rows);

      expect(saved.profileMapping).toEqual(rows);
      expect(saved.definition.claims).toMatchObject({ company: { type: 'string' } });
    });

    it('refuses an attribute mapped twice', async () => {
      await expect(
        save([
          { attribute: 'title', claim: 'bio', when: 'sign-up' },
          { attribute: 'title', claim: 'blog', when: 'every-sign-in' },
        ])
      ).rejects.toThrow(/profileMapping\[1\].*another row/);
    });

    it('reads profileMapping from a provider configured in config, locked', async () => {
      const profileMapping = [{ attribute: 'department', claim: 'company', when: 'sign-up' }];

      registryState.configured = [
        {
          definition: github,
          options: {
            clientId: 'cfg-id',
            clientSecret: 'cfg-secret',
            profileMapping,
            updateUserOnSignIn: true,
          },
          enabled: true,
        },
      ];

      const { provider, warn } = setup();

      expect(await provider.get('github')).toMatchObject({
        source: 'config',
        updateUserOnSignIn: true,
        profileMapping,
      });
      expect((await provider.options()).socialProviders.github).toMatchObject({
        overrideUserInfoOnSignIn: true,
      });
      await expect(provider.update('github', { profileMapping: [] })).rejects.toThrow(
        'config/plugins.ts'
      );
      expect(warn).not.toHaveBeenCalled();
    });
  });
});

describe('the email guard fails closed', () => {
  const guard = (state: Record<string, unknown>) => {
    const strapi = {
      requestContext: { get: () => ({ state }) },
    } as unknown as Core.Strapi;
    const hooks = providerProfile(strapi).init?.({} as never) as unknown as {
      options: {
        databaseHooks: {
          user: {
            update: {
              before: (
                data: Record<string, unknown>,
                context?: { path?: string } | null
              ) => Promise<unknown>;
            };
          };
        };
      };
    };

    return hooks.options.databaseHooks.user.update.before;
  };

  const update = { email: 'other@x.io', emailVerified: true, name: 'N' };
  const dropped = { data: { email: undefined, emailVerified: undefined } };

  it('drops the email of an update in a request with provider claims, whatever the path', async () => {
    const before = guard({ endUsersProviderClaims: { providerId: 'github', profile: {} } });

    expect(await before(update, { path: '/some/new/endpoint' })).toEqual(dropped);
    expect(await before(update, { path: '/link-social' })).toEqual(dropped);
    expect(await before(update)).toEqual(dropped);
  });

  it('still drops it on a known provider path without claims', async () => {
    expect(await guard({})(update, { path: '/callback/github' })).toEqual(dropped);
  });

  it('leaves an update with no claims on another path, or without an email, alone', async () => {
    const before = guard({});

    expect(await before(update, { path: '/change-email' })).toBeUndefined();
    expect(await before({ name: 'N' }, { path: '/callback/github' })).toBeUndefined();
  });
});
