import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { ADMIN_ACTIONS } from '../admin-actions';
import bootstrap, {
  DEFAULT_AUTHENTICATED_PERMISSIONS,
  USER_LIST_LAYOUT,
  ensureEveryUserHasAProfile,
  warnAboutRequiredProfileAttributes,
  writeUserListLayout,
} from '../bootstrap';
import { PROFILE_UID, ROLE_UID, USER_UID } from '../constants';
import { inProfileLifecycle } from '../utils/profile-lifecycle';
import { logBootWarnings } from '../boot-warnings';
import roleService from '../services/role';
import { registry } from '../providers/registry';

vi.mock('../boot-warnings', () => ({ logBootWarnings: vi.fn() }));
vi.mock('../providers/registry', () => ({ registry: vi.fn() }));

const setup = ({ authenticatedCreated = false, publicCreated = false } = {}) => {
  const events: string[] = [];
  const stores: Record<string, Record<string, unknown>> = {};

  const ensureDefaults = vi.fn(async () => {
    events.push('ensureDefaults');

    return { created: { public: publicCreated, authenticated: authenticatedCreated } };
  });
  const getDefault = vi.fn(async () => ({ documentId: 'role-authenticated' }));
  const findForRoles = vi.fn(async () => []);
  const applyDiff = vi.fn(async () => {
    events.push('applyDiff');
  });
  const services = vi.fn((name: string) =>
    name === 'role' ? { ensureDefaults, getDefault } : { findForRoles, applyDiff }
  );
  const plugin = vi.fn(() => ({ service: services }));
  const registerMany = vi.fn(async () => {});
  const adminService = vi.fn(() => ({ actionProvider: { registerMany } }));
  const strapi = {
    plugin,
    service: adminService,
    // No users, and no required profile attribute: the profile steps of the start have nothing to do
    db: { query: vi.fn(() => ({ findMany: vi.fn(async () => []) })) },
    contentTypes: {
      [PROFILE_UID]: {
        attributes: {
          user: { type: 'relation' },
          nickname: { type: 'string' },
          bio: { type: 'text' },
          internalNote: { type: 'string', private: true },
          score: { type: 'integer', writable: false },
          createdAt: { type: 'datetime' },
          createdBy: { type: 'relation' },
        },
      },
    },
    store: ({ name }: { name: string }) => ({
      get: async ({ key }: { key: string }) => stores[name]?.[key] ?? null,
      async set({ key, value }: { key: string; value: unknown }) {
        stores[name] = { ...stores[name], [key]: value };
      },
    }),
    log: { warn: vi.fn() },
  } as unknown as Core.Strapi;

  return {
    stores,
    strapi,
    ensureDefaults,
    getDefault,
    findForRoles,
    applyDiff,
    events,
    service: services,
    plugin,
    registerMany,
    adminService,
  };
};

describe('bootstrap', () => {
  it('loads and validates the provider registry, so a bad providers config refuses at start', async () => {
    const { strapi, ensureDefaults } = setup();

    await bootstrap({ strapi });

    expect(registry).toHaveBeenCalledWith(strapi);

    vi.mocked(registry).mockImplementationOnce(() => {
      throw new Error('Invalid end-users configuration in config/plugins.ts, providers[0]');
    });
    ensureDefaults.mockClear();

    await expect(bootstrap({ strapi })).rejects.toThrow(/providers\[0\]/);
    expect(ensureDefaults).not.toHaveBeenCalled();
  });

  it('creates the Public and Authenticated roles through the role service', async () => {
    const { strapi, ensureDefaults, service, plugin } = setup();

    await bootstrap({ strapi });

    expect(plugin).toHaveBeenCalledWith('end-users');
    expect(service).toHaveBeenCalledWith('role');
    expect(ensureDefaults).toHaveBeenCalledTimes(1);
  });

  describe('the default permissions of the Authenticated role', () => {
    const OWNER = [{ name: 'plugin::end-users.is-owner', params: { field: 'user' } }];
    const meRow = (action: string) => ({ action, subject: null, properties: {}, conditions: [] });
    const profileRow = (action: string) => ({
      action,
      subject: PROFILE_UID,
      properties: {},
      conditions: OWNER,
    });

    it('are the three me routes and find, findOne and update on their own profile, and nothing else', () => {
      expect(DEFAULT_AUTHENTICATED_PERMISSIONS).toEqual([
        meRow('plugin::end-users.me.find'),
        meRow('plugin::end-users.me.findProfile'),
        meRow('plugin::end-users.me.updateProfile'),
        profileRow('plugin::end-users.profile.find'),
        profileRow('plugin::end-users.profile.findOne'),
        profileRow('plugin::end-users.profile.update'),
      ]);
    });

    it('grant no profile create or delete, and nothing on the user type', () => {
      const actions = DEFAULT_AUTHENTICATED_PERMISSIONS.map(({ action }) => action);

      expect(actions).not.toContain('plugin::end-users.profile.create');
      expect(actions).not.toContain('plugin::end-users.profile.delete');
      expect(actions.filter((action) => action.startsWith('plugin::end-users.user.'))).toEqual([]);
    });

    // What the update row is seeded with by `setup`'s profile: its writable attributes, not `user`
    const SEEDED = ['nickname', 'bio'];
    const seededUpdate = {
      ...profileRow('plugin::end-users.profile.update'),
      properties: { fields: SEEDED },
    };

    it('grants the me.* rows and the three is-owner profile rows only when the start created Authenticated', async () => {
      const created = setup({ authenticatedCreated: true });

      await bootstrap({ strapi: created.strapi });

      // One diff: the role gets all six rows or none
      expect(created.applyDiff).toHaveBeenCalledTimes(1);
      expect(created.applyDiff).toHaveBeenCalledWith('role-authenticated', {
        create: [
          meRow('plugin::end-users.me.find'),
          meRow('plugin::end-users.me.findProfile'),
          meRow('plugin::end-users.me.updateProfile'),
          profileRow('plugin::end-users.profile.find'),
          profileRow('plugin::end-users.profile.findOne'),
          seededUpdate,
        ],
        update: [],
        delete: [],
      });

      // A start that found the role there, a database from an earlier version included, grants none of them
      const found = setup({ authenticatedCreated: false, publicCreated: true });

      await bootstrap({ strapi: found.strapi });

      expect(found.applyDiff).not.toHaveBeenCalled();
    });

    it('are granted when this start inserted the role, through the permission service', async () => {
      const { strapi, applyDiff, getDefault, service } = setup({ authenticatedCreated: true });

      await bootstrap({ strapi });

      expect(service).toHaveBeenCalledWith('permission');
      expect(getDefault).toHaveBeenCalledTimes(1);
      expect(applyDiff).toHaveBeenCalledTimes(1);
      expect(applyDiff).toHaveBeenCalledWith('role-authenticated', {
        create: [
          // By action, not by position: every default row but the update, then the seeded update
          ...DEFAULT_AUTHENTICATED_PERMISSIONS.filter(
            ({ action }) => action !== 'plugin::end-users.profile.update'
          ),
          seededUpdate,
        ],
        update: [],
        delete: [],
      });
    });

    it('seeds the profile update row with an explicit field list, without user', async () => {
      const { strapi, applyDiff } = setup({ authenticatedCreated: true });

      await bootstrap({ strapi });

      const [, diff] = applyDiff.mock.calls[0] as unknown as [
        string,
        { create: Array<{ action: string; properties: { fields?: string[] } }> },
      ];
      const update = diff.create.find(
        ({ action }) => action === 'plugin::end-users.profile.update'
      );
      const find = diff.create.find(({ action }) => action === 'plugin::end-users.profile.find');

      // Private, read-only, system and owner attributes are not in it; a field added later is not either
      expect(update?.properties).toEqual({ fields: ['nickname', 'bio'] });
      expect(update?.properties.fields).not.toContain('user');
      // Reading stays every field
      expect(find?.properties).toEqual({});
    });

    it('leaves an existing row alone', async () => {
      // A start that did not create the role writes nothing, so a row an administrator has is kept
      const { strapi, applyDiff } = setup({ authenticatedCreated: false });

      await bootstrap({ strapi });

      expect(applyDiff).not.toHaveBeenCalled();
    });

    it('are granted after the role is made', async () => {
      const { strapi, events } = setup({ authenticatedCreated: true });

      await bootstrap({ strapi });

      expect(events).toEqual(['ensureDefaults', 'applyDiff']);
    });

    it('are not granted again when the role was already there: an administrator may have removed them', async () => {
      const { strapi, applyDiff, getDefault } = setup({ authenticatedCreated: false });

      await bootstrap({ strapi });

      expect(applyDiff).not.toHaveBeenCalled();
      expect(getDefault).not.toHaveBeenCalled();
    });

    it('are not granted for the Public role being created: only the Authenticated role gets them', async () => {
      const { strapi, applyDiff } = setup({ publicCreated: true, authenticatedCreated: false });

      await bootstrap({ strapi });

      expect(applyDiff).not.toHaveBeenCalled();
    });

    it('fail the boot when they cannot be granted, rather than start with a role nobody can use', async () => {
      const { strapi, applyDiff } = setup({ authenticatedCreated: true });

      applyDiff.mockRejectedValueOnce(new Error('database is locked'));

      await expect(bootstrap({ strapi })).rejects.toThrow('database is locked');
    });
  });

  describe('two instances starting together on an empty database', () => {
    // The real role service over a fake database with a unique index on the role name. Both
    // instances look for the Authenticated role before either has inserted it (the look is taken
    // when it is asked for, and answered a tick later), both insert, and the database refuses the
    // second insert. Public is there already, so the race is over the Authenticated role alone.
    interface Database {
      roles: Array<{ type: string; documentId: string }>;
      refused: number;
    }

    const emptyDatabase = (): Database => ({
      roles: [{ type: 'public', documentId: 'public-0' }],
      refused: 0,
    });

    const instance = (database: Database) => {
      const applyDiff = vi.fn(async () => {});

      const findOne = vi.fn(({ where }: { where: { type: string } }) => {
        const found = database.roles.find((role) => role.type === where.type) ?? null;

        return new Promise((resolve) => {
          setTimeout(() => resolve(found), 0);
        });
      });
      const create = vi.fn(async ({ data }: { data: { type: string } }) => {
        // The unique index on `name`: the second insert of a name is refused by the database
        if (database.roles.some((role) => role.type === data.type)) {
          database.refused += 1;

          throw Object.assign(
            new Error('duplicate key value violates unique constraint "eu_roles_name_uq"'),
            { code: '23505', constraint: 'eu_roles_name_uq' }
          );
        }

        const row = { type: data.type, documentId: `${data.type}-${database.roles.length}` };

        database.roles.push(row);

        return row;
      });

      const strapi = {
        db: {
          query: vi.fn((uid: string) =>
            uid === ROLE_UID ? { findOne } : { findMany: vi.fn(async () => []) }
          ),
        },
        contentTypes: {},
        store: () => ({ get: async () => null, set: vi.fn() }),
        log: { warn: vi.fn() },
        documents: vi.fn(() => ({ create })),
        plugin: vi.fn(() => ({
          service: (name: string) => (name === 'role' ? roles : { applyDiff }),
        })),
        service: vi.fn(() => ({ actionProvider: { registerMany: vi.fn(async () => {}) } })),
      } as unknown as Core.Strapi;

      const roles = roleService({ strapi });

      return { strapi, applyDiff, create };
    };

    it('grant once: the instance whose insert is refused grants nothing', async () => {
      const database = emptyDatabase();
      const first = instance(database);
      const second = instance(database);

      await Promise.all([
        bootstrap({ strapi: first.strapi }),
        bootstrap({ strapi: second.strapi }),
      ]);

      // Both inserted, and the database refused one of the two inserts
      expect(first.create).toHaveBeenCalledTimes(1);
      expect(second.create).toHaveBeenCalledTimes(1);
      expect(database.refused).toBe(1);
      expect(database.roles.map((role) => role.type).sort()).toEqual(['authenticated', 'public']);

      // The permissions were written by exactly one of them
      const grants = [first.applyDiff, second.applyDiff].flatMap(
        (applyDiff) => applyDiff.mock.calls
      );

      expect(grants).toHaveLength(1);
      expect(grants[0]).toEqual([
        expect.stringMatching(/^authenticated-/),
        expect.objectContaining({
          create: DEFAULT_AUTHENTICATED_PERMISSIONS.map(({ action }) =>
            expect.objectContaining({ action })
          ),
        }),
      ]);
    });

    it('grant nothing for an instance that starts once the role is there', async () => {
      const database = emptyDatabase();
      const first = instance(database);

      await bootstrap({ strapi: first.strapi });

      const later = instance(database);

      await bootstrap({ strapi: later.strapi });

      expect(first.applyDiff).toHaveBeenCalledTimes(1);
      expect(later.applyDiff).not.toHaveBeenCalled();
      expect(later.create).not.toHaveBeenCalled();
    });
  });

  it('logs the boot warnings', async () => {
    const { strapi } = setup();

    await bootstrap({ strapi });

    expect(logBootWarnings).toHaveBeenCalledWith(strapi);
  });

  it('registers the admin RBAC actions with the admin permission service', async () => {
    const { strapi, registerMany, adminService } = setup();

    await bootstrap({ strapi });

    expect(adminService).toHaveBeenCalledWith('admin::permission');
    expect(registerMany).toHaveBeenCalledTimes(1);
    expect(registerMany).toHaveBeenCalledWith(ADMIN_ACTIONS);
  });

  it('registers the role, condition, provider and settings actions, as actions of this plugin in the Plugins section', async () => {
    const { strapi, registerMany } = setup();

    await bootstrap({ strapi });

    const registered = (registerMany.mock.calls[0] as unknown as [typeof ADMIN_ACTIONS])[0];

    expect(registered.map(({ uid }) => uid).sort()).toEqual([
      'conditions.read',
      'conditions.update',
      'providers.read',
      'providers.update',
      'roles.create',
      'roles.delete',
      'roles.read',
      'roles.update',
      'settings.read',
      'settings.update',
    ]);

    for (const action of registered) {
      expect(action).toMatchObject({ section: 'plugins', pluginName: 'end-users' });
    }
  });

  it('fails the boot when the roles cannot be created, rather than starting without them', async () => {
    const { strapi, ensureDefaults } = setup();

    ensureDefaults.mockRejectedValueOnce(new Error('database is locked'));

    await expect(bootstrap({ strapi })).rejects.toThrow('database is locked');
  });
});

describe('the Content Manager list layout of the user', () => {
  const KEY = `configuration_content_types::${USER_UID}`;
  const withUser = (strapi: Core.Strapi, attributes: Record<string, unknown>) =>
    Object.assign(strapi.contentTypes as object, { [USER_UID]: { attributes } });
  const ALL = Object.fromEntries(USER_LIST_LAYOUT.map((name) => [name, { type: 'string' }]));
  const edit = [[{ name: 'email', size: 6 }]];

  it('lists the columns an administrator needs, in order', () => {
    expect(USER_LIST_LAYOUT).toEqual([
      'email',
      'username',
      'roles',
      'emailVerified',
      'twoFactorEnabled',
      'banned',
      'lastSignInAt',
    ]);
  });

  it('writes the list layout once and leaves an edited one alone', async () => {
    const { strapi, stores } = setup();

    withUser(strapi, ALL);
    stores.content_manager = {
      [KEY]: { uid: USER_UID, layouts: { list: ['name', 'email'], edit } },
    };

    expect(await writeUserListLayout(strapi)).toBe(true);
    expect(stores.content_manager[KEY]).toEqual({
      uid: USER_UID,
      layouts: { list: [...USER_LIST_LAYOUT], edit },
    });

    // An administrator reorders it; the next start does not put it back
    const edited = { uid: USER_UID, layouts: { list: ['email'], edit } };

    stores.content_manager[KEY] = edited;

    expect(await writeUserListLayout(strapi)).toBe(false);
    expect(stores.content_manager[KEY]).toBe(edited);
  });

  it('leaves out a column the type does not have', async () => {
    const { strapi, stores } = setup();

    withUser(strapi, { email: {}, roles: {}, lastSignInAt: {} });
    stores.content_manager = { [KEY]: { layouts: { list: [], edit } } };

    await writeUserListLayout(strapi);

    expect((stores.content_manager[KEY] as { layouts: { list: string[] } }).layouts.list).toEqual([
      'email',
      'roles',
      'lastSignInAt',
    ]);
  });

  it('writes nothing, and records nothing, before the Content Manager has made the configuration', async () => {
    const { strapi, stores } = setup();

    withUser(strapi, ALL);

    expect(await writeUserListLayout(strapi)).toBe(false);
    expect(stores).toEqual({});
  });

  it('is part of the start', async () => {
    const { strapi, stores } = setup();

    withUser(strapi, ALL);
    stores.content_manager = { [KEY]: { layouts: { list: [], edit } } };

    await bootstrap({ strapi });

    expect((stores.content_manager[KEY] as { layouts: { list: string[] } }).layouts.list).toEqual([
      ...USER_LIST_LAYOUT,
    ]);
  });
});

describe('the profile of every user', () => {
  interface Fake {
    users: Array<{ id: number; documentId: string }>;
    profileOwners: string[];
    attributes?: Record<string, unknown>;
    failWith?: Record<string, Error>;
    /** Users whose profile another instance commits first, so the create here is refused */
    racedFor?: string[];
  }

  const fake = ({ users, profileOwners, attributes = {}, failWith = {}, racedFor = [] }: Fake) => {
    const created: Array<{ data: unknown; marked: boolean }> = [];
    const warn = vi.fn();

    const userQuery = {
      findMany: vi.fn(async ({ where, limit }: { where: { id: { $gt: number } }; limit: number }) =>
        users.filter((user) => user.id > where.id.$gt).slice(0, limit)
      ),
    };
    const profileQuery = {
      findMany: vi.fn(async ({ where }: { where: { user: { documentId: { $in: string[] } } } }) =>
        profileOwners
          .filter((owner) => where.user.documentId.$in.includes(owner))
          .map((owner) => ({ user: { documentId: owner } }))
      ),
      findOne: vi.fn(async ({ where }: { where: { user: { documentId: string } } }) =>
        profileOwners.includes(where.user.documentId) ? { id: 1 } : null
      ),
    };
    const create = vi.fn(async ({ data }: { data: { user: { connect: string[] } } }) => {
      const [owner] = data.user.connect;

      if (racedFor.includes(owner)) {
        profileOwners.push(owner);

        throw new Error('This user already has a profile');
      }

      if (failWith[owner]) {
        throw failWith[owner];
      }

      created.push({ data, marked: inProfileLifecycle() });
      profileOwners.push(owner);

      return { documentId: `profile-of-${owner}` };
    });

    const strapi = {
      db: { query: vi.fn((uid: string) => (uid === USER_UID ? userQuery : profileQuery)) },
      documents: vi.fn(() => ({ create })),
      contentTypes: { [PROFILE_UID]: { attributes } },
      log: { warn },
    } as unknown as Core.Strapi;

    return { strapi, created, warn, create };
  };

  it('makes missing profiles at start and logs the ones it cannot make', async () => {
    const { strapi, created, warn } = fake({
      users: [
        { id: 1, documentId: 'user-1' },
        { id: 2, documentId: 'user-2' },
        { id: 3, documentId: 'user-3' },
        { id: 4, documentId: 'user-4' },
      ],
      profileOwners: ['user-1'],
      failWith: {
        'user-3': Object.assign(new Error('company must be defined'), {
          details: { errors: [{ path: ['company'], message: 'company must be defined' }] },
        }),
      },
    });

    const result = await ensureEveryUserHasAProfile(strapi);

    expect(result).toEqual({
      created: 2,
      failed: [{ userId: 'user-3', reason: 'company: company must be defined' }],
    });
    // Made as the plugin's own create, so `one-profile-per-user` lets it through
    expect(created).toEqual([
      { data: { user: { connect: ['user-2'] } }, marked: true },
      { data: { user: { connect: ['user-4'] } }, marked: true },
    ]);
    // It names the user and the field, and the start goes on to the next user
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('user-3');
    expect(warn.mock.calls[0][0]).toContain('company');
  });

  it('counts nothing as failed when another instance made the profile first', async () => {
    const { strapi } = fake({
      users: [{ id: 1, documentId: 'user-1' }],
      profileOwners: [],
      racedFor: ['user-1'],
    });

    const result = await ensureEveryUserHasAProfile(strapi);

    expect(result).toEqual({ created: 0, failed: [] });
  });

  it('reads the users a page at a time and makes none when every user has a profile', async () => {
    const users = Array.from({ length: 1200 }, (_, index) => ({
      id: index + 1,
      documentId: `user-${index + 1}`,
    }));
    const { strapi, create } = fake({ users, profileOwners: users.map((user) => user.documentId) });

    const result = await ensureEveryUserHasAProfile(strapi);

    expect(result).toEqual({ created: 0, failed: [] });
    expect(create).not.toHaveBeenCalled();
    expect(
      (strapi.db.query(USER_UID) as unknown as { findMany: { mock: { calls: unknown[] } } })
        .findMany.mock.calls
    ).toHaveLength(4); // three pages, and the empty one that ends it
  });

  it('is part of the start', async () => {
    const { strapi, created } = fake({
      users: [{ id: 1, documentId: 'user-1' }],
      profileOwners: [],
    });
    const base = setup();

    await bootstrap({
      strapi: Object.assign(base.strapi, { db: strapi.db, documents: strapi.documents }),
    });

    expect(created).toHaveLength(1);
  });

  it('warns at start about a required profile attribute with no default', () => {
    const { strapi, warn } = fake({
      users: [],
      profileOwners: [],
      attributes: {
        user: { type: 'relation', required: true },
        company: { type: 'string', required: true },
        plan: { type: 'string', required: true, default: 'free' },
        nickname: { type: 'string' },
        slug: { type: 'uid', required: true },
      },
    });

    expect(warnAboutRequiredProfileAttributes(strapi)).toEqual(['company']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('`company`');
  });

  it('does not warn when every required attribute has a default', () => {
    const { strapi, warn } = fake({
      users: [],
      profileOwners: [],
      attributes: { user: { type: 'relation', required: true } },
    });

    expect(warnAboutRequiredProfileAttributes(strapi)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});
