import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { z } from '@strapi/utils';

import { isOwner, isSelf } from '../conditions';
import { PROFILE_UID, USER_UID } from '../constants';
import profile from '../content-types/profile';
import { normalizeEmailMiddleware } from '../document-middlewares/normalize-email';
import register from '../register';
import { engineOwnedUserFieldsValidator } from '../utils/engine-owned-user-fields';

type Table = { name: string; fields: Record<string, { type: string }> };

const USER_TABLE: Table = { name: 'user', fields: { email: { type: 'string' } } };

const setup = ({
  user = true,
  distSrc = '/nonexistent/dist/src',
  graphql = true,
  tables = [USER_TABLE],
}: {
  user?: boolean;
  distSrc?: string;
  /** Whether the GraphQL plugin is installed */
  graphql?: boolean;
  /** The tables of the engine */
  tables?: Table[];
} = {}) => {
  const add = vi.fn();
  const authRegister = vi.fn();
  const use = vi.fn();
  const engine = { schema: vi.fn(() => tables) };
  const get = vi.fn(() => engine);
  // The email plugin's templates: what the plugin registers its emails with
  const templateRegister = vi.fn();
  const service = vi.fn(() => ({ get, register: templateRegister }));
  // The GraphQL plugin's extension service: what the engine's types are hidden through
  const disable = vi.fn();
  const disableQueries = vi.fn();
  const shadowCRUD = vi.fn(() => ({ disable, disableQueries }));
  const graphqlService = vi.fn(() => ({ shadowCRUD }));
  const plugin = vi.fn((name: string) => {
    if (name !== 'graphql') {
      return { service };
    }

    return graphql ? { service: graphqlService } : undefined;
  });
  // Core's condition registry: what the plugin registers its conditions with
  const conditionRegister = vi.fn<(definition: { name: string }) => Promise<void>>(async () => {});
  // Core's registry of Content API validators (`strapi.validators`)
  const validatorsAdd = vi.fn();
  // Core's Koa server, and the registry of extra Content API query params
  const serverUse = vi.fn();
  const addQueryParams = vi.fn();

  const strapi = {
    dirs: {
      app: { root: '/nonexistent/app' },
      dist: {
        extensions: user ? '/nonexistent/dist/extensions' : '/nonexistent/dist/extensions',
        src: distSrc,
      },
    },
    contentTypes: { [PROFILE_UID]: profile.schema },
    contentAPI: {
      permissions: { providers: { condition: { register: conditionRegister } } },
      addQueryParams,
    },
    server: { use: serverUse },
    validators: { add: validatorsAdd },
    plugin,
    config: { get: vi.fn() },
    // The start control registers its `beforeSync` handler on a hook
    hook: vi.fn(() => ({ register: vi.fn() })),
    documents: { use },
    get: vi.fn((name: string) => (name === 'auth' ? { register: authRegister } : { add })),
    db: {
      metadata: {
        identifiers: {
          getIndexName: (names: string | string[]) => [names].flat().join('_'),
          getUniqueIndexName: (names: string | string[]) => [names].flat().join('_'),
          getTableName: (name: string) => name,
        },
        naming: { columnName: (name: string) => name },
      },
    },
  } as unknown as Core.Strapi;

  return {
    strapi,
    add,
    authRegister,
    use,
    engine,
    plugin,
    service,
    templateRegister,
    conditionRegister,
    validatorsAdd,
    serverUse,
    addQueryParams,
    shadowCRUD,
    disable,
    disableQueries,
    graphqlService,
  };
};

describe('register', () => {
  it('registers the content types of the engine under the plugin namespace', () => {
    const { strapi, add, plugin, service } = setup();

    register({ strapi });

    expect(plugin).toHaveBeenCalledWith('end-users');
    expect(service).toHaveBeenCalledWith('engine');
    expect(add).toHaveBeenCalledWith(
      'plugin::end-users',
      expect.objectContaining({ user: expect.anything() })
    );
  });

  it('registers the eight email templates with the email plugin', () => {
    const { strapi, plugin, service, templateRegister } = setup();

    register({ strapi });

    expect(plugin).toHaveBeenCalledWith('email');
    expect(service).toHaveBeenCalledWith('templates');
    expect(templateRegister.mock.calls.map((call) => call[0]).sort()).toEqual([
      'end-users.change-email',
      'end-users.email-changed',
      'end-users.email-otp',
      'end-users.magic-link',
      'end-users.reset-password',
      'end-users.two-factor-otp',
      'end-users.verify-email',
      'end-users.welcome',
    ]);
    expect(templateRegister).toHaveBeenCalledWith(
      'end-users.reset-password',
      expect.objectContaining({
        variables: ['user.name', 'user.email', { name: 'url', secret: true, url: true }],
        defaults: expect.objectContaining({
          subject: expect.any(String),
          html: expect.any(String),
          text: expect.any(String),
        }),
      })
    );
  });

  it('registers end-users.email-changed with its three variables and an English default', () => {
    const { strapi, templateRegister } = setup();

    register({ strapi });

    expect(templateRegister).toHaveBeenCalledWith(
      'end-users.email-changed',
      expect.objectContaining({
        variables: ['appName', 'newEmailMasked', 'changedAt'],
        defaults: {
          subject: 'Your email address was changed',
          html: expect.stringContaining('{{ newEmailMasked }}'),
          text: expect.stringContaining('{{ newEmailMasked }}'),
        },
      })
    );
  });

  describe('explain mode', () => {
    it('adds the middleware that explains the permission checks to the server', () => {
      const { strapi, serverUse } = setup();

      register({ strapi });

      expect(serverUse).toHaveBeenCalledTimes(1);
      expect(serverUse).toHaveBeenCalledWith(expect.any(Function));
    });

    it('registers ?explain as a query param of the Content API that takes true or false', () => {
      const { strapi, addQueryParams } = setup();

      register({ strapi });

      expect(addQueryParams).toHaveBeenCalledTimes(1);

      const [params] = addQueryParams.mock.calls[0] as [
        { explain: { schema: (zod: typeof z) => z.ZodType } },
      ];
      const schema = params.explain.schema(z);

      expect(Object.keys(params)).toEqual(['explain']);
      expect(schema.safeParse('true').success).toBe(true);
      expect(schema.safeParse('false').success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse('yes').success).toBe(false);
    });
  });

  describe('GraphQL', () => {
    const tables: Table[] = [
      USER_TABLE,
      { name: 'session', fields: { token: { type: 'string' } } },
      { name: 'twoFactor', fields: { secret: { type: 'string' } } },
      { name: 'jwks', fields: { privateKey: { type: 'string' } } },
    ];

    it('disables shadow CRUD for each engine type except the user, and for permission', () => {
      const { strapi, shadowCRUD, disable, graphqlService } = setup({ tables });

      register({ strapi });

      expect(graphqlService).toHaveBeenCalledWith('extension');
      expect(shadowCRUD.mock.calls.map(([uid]: unknown[]) => uid).sort()).toEqual([
        'plugin::end-users.jwk',
        'plugin::end-users.permission',
        'plugin::end-users.role',
        'plugin::end-users.session',
        'plugin::end-users.two-factor',
      ]);
      expect(disable).toHaveBeenCalledTimes(4);
    });

    it('leaves the role no query of its own: it is read through the user', () => {
      const { strapi, shadowCRUD, disable, disableQueries } = setup({ tables });

      register({ strapi });

      expect(disableQueries).toHaveBeenCalledTimes(1);
      expect(shadowCRUD).toHaveBeenLastCalledWith('plugin::end-users.role');
      expect(disable).not.toHaveBeenCalledWith('plugin::end-users.role');
    });

    it('follows the engine: a type the configuration does not produce is not named', () => {
      const { strapi, shadowCRUD } = setup();

      register({ strapi });

      expect(shadowCRUD.mock.calls.map(([uid]: unknown[]) => uid)).toEqual([
        'plugin::end-users.permission',
        'plugin::end-users.role',
      ]);
    });

    it('does nothing when the GraphQL plugin is not installed', () => {
      const { strapi, shadowCRUD, graphqlService } = setup({ tables, graphql: false });

      expect(() => register({ strapi })).not.toThrow();
      expect(shadowCRUD).not.toHaveBeenCalled();
      expect(graphqlService).not.toHaveBeenCalled();
    });
  });

  it('registers the email rule of the Document Service', () => {
    const { strapi, use } = setup();

    register({ strapi });

    expect(use).toHaveBeenCalledWith(normalizeEmailMiddleware);
  });

  it('registers the friendly check of the unique email and username, after the email rule', () => {
    const { strapi, use } = setup();

    register({ strapi });

    expect(use.mock.calls[0][0]).toBe(normalizeEmailMiddleware);
    expect(use.mock.calls[1][0]).toEqual(expect.any(Function));
    expect(use.mock.calls[1][0]).not.toBe(normalizeEmailMiddleware);
  });

  it('registers the default role of a new user after the checks on what a create writes, so a refused create never looks it up', async () => {
    const { strapi, use, service, engine } = setup();

    service.mockImplementation(((name: string) => {
      if (name === 'role')
        return { getDefault: async () => ({ documentId: 'role-authenticated' }) };
      if (name === 'settings') return { get: async () => ({ signUp: { defaultRoles: [] } }) };

      return { get: () => engine, register: vi.fn() };
    }) as never);

    register({ strapi });

    const ctx = { uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io' } } };
    await use.mock.calls[2][0](ctx as never, async () => {});

    expect(ctx.params.data).toMatchObject({ roles: { connect: ['role-authenticated'] } });
  });

  it('registers the data rules of the user and the profile after the role is assigned, so the user is in the create with its role when the profile is made', async () => {
    const { strapi, use, service, engine } = setup();
    const setPassword = vi.fn(async () => {});
    const revokeSessions = vi.fn(async () => {});

    service.mockImplementation(((name: string) => {
      if (name === 'role')
        return { getDefault: async () => ({ documentId: 'role-authenticated' }) };
      if (name === 'settings') return { get: async () => ({ signUp: { defaultRoles: [] } }) };

      return { get: () => ({ ...engine, setPassword, revokeSessions }), register: vi.fn() };
    }) as never);
    Object.assign(strapi, {
      config: { get: (_key: string, fallback: unknown) => fallback },
      documents: Object.assign(() => ({ create: vi.fn(async () => ({})) }), { use }),
      db: Object.assign((strapi as unknown as { db: object }).db, {
        query: () => ({ findOne: async () => null }),
        transaction: async (callback: () => Promise<unknown>) => callback(),
      }),
    });

    register({ strapi });

    // Six rules after the three that check and complete what a user create writes
    expect(use).toHaveBeenCalledTimes(9);

    // Run the chain the way the Document Service does, outermost first, on a user create with a
    // password, and watch the order things happen in
    const events: string[] = [];
    const ctx = {
      uid: USER_UID,
      action: 'create',
      params: { data: { email: 'a@x.io', password: 'Passw0rd!long' } },
    };

    setPassword.mockImplementation(async () => {
      events.push('password set');
    });

    const chain = use.mock.calls.map(([middleware]) => middleware);
    const dispatch = (index: number): Promise<unknown> =>
      index < chain.length
        ? chain[index](ctx as never, () => dispatch(index + 1) as never)
        : (async () => {
            events.push(
              `user written with ${JSON.stringify((ctx.params.data as Record<string, unknown>).roles)}`
            );

            return { documentId: 'user-1' };
          })();

    await dispatch(0);

    expect(events).toEqual([
      'user written with {"connect":["role-authenticated"]}',
      'password set',
    ]);
    expect(ctx.params.data).not.toHaveProperty('password');
  });

  it('registers the end-users strategy for the Content API', () => {
    const { strapi, authRegister } = setup();

    register({ strapi });

    expect(authRegister).toHaveBeenCalledTimes(1);
    expect(authRegister).toHaveBeenCalledWith(
      'content-api',
      expect.objectContaining({
        name: 'end-users',
        authenticate: expect.any(Function),
        verify: expect.any(Function),
      })
    );
  });

  it('registers the engine-owned-user-fields validator on content-api.input', () => {
    const { strapi, validatorsAdd } = setup();

    register({ strapi });

    expect(validatorsAdd).toHaveBeenCalledTimes(1);
    expect(validatorsAdd).toHaveBeenCalledWith('content-api.input', engineOwnedUserFieldsValidator);
  });

  describe('the Content API conditions', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'end-users-register-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("registers the built-in conditions, awaited, before the project's", async () => {
      const conditionsDir = join(dir, 'end-users', 'conditions');

      mkdirSync(conditionsDir, { recursive: true });
      writeFileSync(
        join(conditionsDir, 'shared-notes.js'),
        `module.exports = { name: 'shared-notes', displayName: 'Shared', query: () => true };`
      );

      const { strapi, conditionRegister } = setup({ distSrc: dir });
      const events: string[] = [];

      // Each registration settles a tick later: the next one may only start once it has
      conditionRegister.mockImplementation(async ({ name }) => {
        events.push(`start ${name}`);
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
        events.push(`done ${name}`);
      });

      const registering = register({ strapi });

      expect(registering).toBeInstanceOf(Promise);

      await registering;

      expect(events).toEqual([
        'start plugin::end-users.is-self',
        'done plugin::end-users.is-self',
        'start plugin::end-users.is-owner',
        'done plugin::end-users.is-owner',
        'start api::shared-notes',
        'done api::shared-notes',
      ]);
      expect(conditionRegister).toHaveBeenNthCalledWith(1, isSelf);
      expect(conditionRegister).toHaveBeenNthCalledWith(2, isOwner);
    });

    describe('the connect callbacks', () => {
      const callbacks = { github: 'https://evil.example.com/callback' };

      const withCallbacks = (isTrustedOrigin: (origin: string) => Promise<boolean>) => {
        const made = setup({ distSrc: dir });

        Object.assign(made.engine, { isTrustedOrigin });
        Object.assign(made.strapi, {
          config: {
            get: (key: string) =>
              key === 'plugin::end-users.compat.connect.callbacks' ? callbacks : undefined,
          },
        });

        return made;
      };

      it('checks them before it registers the conditions, and waits for the check', async () => {
        const events: string[] = [];
        const { strapi, conditionRegister } = withCallbacks(async (origin) => {
          events.push(`check ${origin}`);
          await new Promise((resolve) => {
            setTimeout(resolve, 0);
          });
          events.push('checked');

          return true;
        });

        conditionRegister.mockImplementation(async ({ name }) => {
          events.push(`register ${name}`);
        });

        await register({ strapi });

        expect(events).toEqual([
          'check https://evil.example.com',
          'checked',
          'register plugin::end-users.is-self',
          'register plugin::end-users.is-owner',
        ]);
      });

      it('rejects when an origin is not trusted, and registers no condition', async () => {
        const { strapi, conditionRegister } = withCallbacks(async () => false);

        await expect(register({ strapi })).rejects.toThrow(/compat\.connect\.callbacks/);
        expect(conditionRegister).not.toHaveBeenCalled();
      });
    });

    it('fails to register when a built-in condition is refused', async () => {
      const { strapi, conditionRegister } = setup({ distSrc: dir });

      conditionRegister.mockRejectedValueOnce(new Error('Duplicated item key'));

      await expect(register({ strapi })).rejects.toThrow('Duplicated item key');
    });
  });

  it('refuses a relation to the user with two sides before it builds anything', () => {
    const { strapi, add, plugin, authRegister, validatorsAdd } = setup();

    (strapi as unknown as { contentTypes: unknown }).contentTypes = {
      'api::article.article': {
        attributes: {
          author: { type: 'relation', target: 'plugin::end-users.user', inversedBy: 'articles' },
        },
      },
    };

    expect(() => register({ strapi })).toThrow(/one-way/);
    expect(plugin).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(authRegister).not.toHaveBeenCalled();
    expect(validatorsAdd).not.toHaveBeenCalled();
  });

  it('refuses a profile type that lost its user attribute before it builds anything', () => {
    const { strapi, add, plugin, authRegister } = setup();

    (strapi as unknown as { contentTypes: unknown }).contentTypes = {
      [PROFILE_UID]: { attributes: { company: { type: 'string' } } },
    };

    expect(() => register({ strapi })).toThrow(/profile attribute "user"/);
    expect(plugin).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(authRegister).not.toHaveBeenCalled();
  });
});

describe('the development secret', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'end-users-secret-'));
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('END_USERS_SECRET', '');
    vi.stubEnv('ENV_PATH', join(dir, '.env'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(dir, { recursive: true, force: true });
  });

  /** The app of a project that has no secret: `config.set` keeps it, `fs.appendFile` writes `.env` */
  const withoutSecret = (secret?: string) => {
    const { strapi, ...rest } = setup();
    const values: Record<string, unknown> = { 'plugin::end-users.secret': secret };
    const set = vi.fn((key: string, value: unknown) => {
      values[key] = value;
    });
    const info = vi.fn();
    const appendFile = vi.fn((path: string, data: string) => appendFileSync(path, data));

    Object.assign(strapi, {
      config: { get: (key: string) => values[key], set },
      fs: { appendFile },
      log: { info },
    });

    return { strapi, set, info, appendFile, ...rest };
  };

  it('generates a secret in development, writes it to .env once and logs it', () => {
    const { strapi, set, info, appendFile } = withoutSecret();

    register({ strapi });

    const [key, secret] = set.mock.calls[0] as [string, string];

    expect(key).toBe('plugin::end-users.secret');
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(appendFile).toHaveBeenCalledTimes(1);
    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(`END_USERS_SECRET=${secret}\n`);
    expect(process.env.END_USERS_SECRET).toBe(secret);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toMatch(/END_USERS_SECRET/);
    expect(info.mock.calls[0][0]).not.toContain(secret);

    // the next boot reads it back from .env, so there is a secret and nothing more is written
    const again = withoutSecret(secret);

    register({ strapi: again.strapi });

    expect(again.set).not.toHaveBeenCalled();
    expect(again.appendFile).not.toHaveBeenCalled();
    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(`END_USERS_SECRET=${secret}\n`);
  });

  it('writes it once when a restart re-forks with this environment', () => {
    const first = withoutSecret();

    register({ strapi: first.strapi });

    // the forked process has the variable in its environment but not in config yet
    const second = withoutSecret();

    register({ strapi: second.strapi });

    expect(second.appendFile).not.toHaveBeenCalled();
    expect(readFileSync(join(dir, '.env'), 'utf8').match(/END_USERS_SECRET=/g)).toHaveLength(1);
  });

  it('does not write .env when the variable is already in the environment', () => {
    vi.stubEnv('END_USERS_SECRET', 'set-by-the-host');

    const { strapi, appendFile } = withoutSecret();

    register({ strapi });

    expect(appendFile).not.toHaveBeenCalled();
  });

  it('makes no secret outside development', () => {
    for (const env of ['production', 'test']) {
      vi.stubEnv('NODE_ENV', env);

      const { strapi, set, appendFile } = withoutSecret();

      register({ strapi });

      expect(set, env).not.toHaveBeenCalled();
      expect(appendFile, env).not.toHaveBeenCalled();
    }
  });
});
