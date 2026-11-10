/**
 * The data move's file: the start control here, the migration itself in the cases that follow.
 */
import {
  checkInstance,
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { Core } from '@strapi/types';
import type { FixtureUser, UsersPermissionsProject } from '../utils/users-permissions-project';
import { readRecord } from '../../../../../packages/plugins/end-users/server/src/migration/record';
import { resetDatabase } from '../utils/reset-database';

describe('migration from users-permissions: start control', () => {
  let project: UsersPermissionsProject;

  beforeAll(async () => {
    project = await seedUsersPermissionsProject();
  });

  afterAll(() => {
    removeProjectTypes();
  });

  it('refuses to start when users-permissions holds users and the migration was not asked for, and changes nothing', async () => {
    await expect(
      migratedInstance(project, { migration: { fromUsersPermissions: null } })
    ).rejects.toThrow(/migration\.fromUsersPermissions/);

    const state = await inspectDatabase(async (db) => {
      // MySQL answers with the rows and the column descriptions in one array, which is not the rows
      const stagingTables = (await tablesLike(db, 'eu_stg_')).length;

      return {
        users: Number((await db('up_users').count({ c: '*' }).first())?.c),
        stagingTables,
      };
    });

    expect(state).toEqual({ users: Object.keys(project.users).length, stagingTables: 0 });
  });

  it('aborts before any change when duplicates are set to abort', async () => {
    const mysql =
      (await inspectDatabase(async (db) => String(db.client.config.client))) === 'mysql2';
    const usernameGroups = mysql ? 0 : 1;

    await expect(migratedInstance(project, { migration: { duplicates: 'abort' } })).rejects.toThrow(
      new RegExp(
        `1 email group and ${usernameGroups} username group${usernameGroups === 1 ? '' : 's'}`
      )
    );

    const state = await inspectDatabase(async (db) => ({
      users: Number((await db('up_users').count({ c: '*' }).first())?.c),
      renamed: await db.schema.hasTable('eu_users'),
      record: await db('strapi_core_store_settings')
        .where('key', 'plugin_end-users_migration')
        .first(),
    }));

    expect(state.users).toBe(Object.keys(project.users).length);
    expect(state.renamed).toBe(false);
    expect(state.record).toBeUndefined();
  });
});

const rowsOf = (client: string, raw: any): Array<Record<string, any>> => {
  if (client.includes('pg')) {
    return raw.rows;
  }

  return client.includes('mysql') ? raw[0] : raw;
};

type ClientKind = 'pg' | 'mysql' | 'sqlite';

const clientKind = (client: string): ClientKind => {
  if (client.includes('pg')) {
    return 'pg';
  }

  if (client.includes('mysql')) {
    return 'mysql';
  }

  return 'sqlite';
};

/** The query listing a table's indexes, per database */
const INDEX_QUERIES: Record<ClientKind, string> = {
  pg: 'select indexname as name from pg_indexes where schemaname = current_schema() and tablename = ?',
  mysql:
    'select index_name as name from information_schema.statistics where table_schema = database() and table_name = ?',
  sqlite: 'pragma index_list(??)',
};

/** The query listing every table, per database */
const TABLE_QUERIES: Record<ClientKind, string> = {
  pg: 'select tablename as name from pg_tables where schemaname = current_schema()',
  mysql: 'select table_name as name from information_schema.tables where table_schema = database()',
  sqlite: "select name from sqlite_master where type = 'table'",
};

/** The names of a table's indexes, whatever the database */
const indexNames = async (db: any, table: string): Promise<string[]> => {
  const client = String(db.client.config.client);
  const raw = await db.raw(INDEX_QUERIES[clientKind(client)], [table]);

  return rowsOf(client, raw).map((row) => String(row.name));
};

/** The tables whose name starts with a prefix, compared here rather than with LIKE, which would need escaping */
const tablesLike = async (db: any, prefix: string): Promise<string[]> => {
  const client = String(db.client.config.client);
  const raw = await db.raw(TABLE_QUERIES[clientKind(client)]);

  return rowsOf(client, raw)
    .map((row) => String(row.name))
    .filter((name) => name.startsWith(prefix));
};

const readRecord = (strapi: Core.Strapi) =>
  strapi.store({ type: 'plugin', name: 'end-users' }).get({ key: 'migration' }) as Promise<{
    status: string;
    cutoverAt: string | null;
    completedSteps: string[];
    staged: Record<string, string>;
    attempt: number;
    carried: { defaultRoleDocumentId: string | null; copied: string[]; columns: string[] };
  }>;

/**
 * A finished migration leaves a link table whose key points at the end-users table, which the next
 * seed's start drops, and staged tables that hold keys to each other: the project is seeded again
 * on tables that are made anew
 */
const resetAfterMigration = () =>
  inspectDatabase(async (db) => {
    await db.schema.dropTableIfExists('memos_author_lnk');

    // Postgres drops staged tables together
    if (String(db.client.config.client) === 'pg') {
      for (const table of await tablesLike(db, 'eu_stg_')) {
        // eslint-disable-next-line no-await-in-loop
        await db.raw('drop table if exists ?? cascade', [table]);
      }
    }
  });

describe('migration from users-permissions: before the schema sync', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;

  const userRow = (key: FixtureUser) =>
    strapi.db.connection('eu_users').where({ id: project.users[key].id }).first();

  beforeAll(async () => {
    project = await seedUsersPermissionsProject();
    strapi = await migratedInstance(project);
  });

  afterAll(async () => {
    await strapi?.destroy();
    removeProjectTypes();
  });

  it('keeps every user, their numeric ids and documentIds', async () => {
    const rows = await strapi.db.connection('eu_users').select('id', 'document_id');
    const fixtures = Object.values(project.users);

    expect(rows).toHaveLength(fixtures.length);

    for (const user of fixtures) {
      expect(rows).toContainEqual({ id: user.id, document_id: user.documentId });
    }
  });

  it('lowercases emails and moves the newer duplicate aside', async () => {
    expect((await userRow('alice')).email).toBe('alice@example.com');
    expect((await userRow('aliceDuplicate')).email).toBe(
      `alice+dup${project.users.aliceDuplicate.id}@users.invalid`
    );
    expect((await userRow('bob')).email).toBe('bob@example.com');
  });

  it('lowercases usernames, keeps the spelling in displayUsername, and suffixes a collision', async () => {
    const alice = await userRow('alice');

    expect([alice.username, alice.display_username]).toEqual(['alice', 'Alice']);
    expect((await userRow('erin')).username).toBe('erin');

    // MySQL compares caselessly and holds no second ERIN
    if (project.users.erinUpper) {
      const upper = await userRow('erinUpper');

      expect([upper.username, upper.display_username]).toEqual([
        `erin_${project.users.erinUpper.id}`,
        'ERIN',
      ]);
    }
  });

  it('makes role names unique', async () => {
    const names = await strapi.db
      .connection('eu_roles')
      .whereIn('id', [project.roles.editors.id, project.roles.editorsLower.id])
      .orderBy('id')
      .pluck('name');

    expect(names).toEqual(['Editors', 'editors (2)']);
  });

  it('keeps a user link table the profile does not declare in staging', async () => {
    const record = await readRecord(strapi);
    const staged = Object.entries(record.staged).find(
      ([, from]) => from === 'up_users_favorites_lnk'
    );

    expect(staged).toBeDefined();

    const rows = await strapi.db.connection(staged![0]).select();

    expect(rows.filter((row) => row.user_id === project.users.alice.id)).toHaveLength(2);

    // Every other users-permissions table is staged too, and nothing is left under its own name
    const state = await inspectDatabase(async (db) => ({
      staging: await tablesLike(db, 'eu_stg_'),
      old: await tablesLike(db, 'up_'),
    }));

    // The post-sync copies the tables the profile declares and drops them
    expect(state.staging.sort()).toEqual(
      Object.keys(record.staged)
        .filter((name) => !record.carried.copied.includes(name))
        .sort()
    );
    expect(state.old).toEqual([]);
  });

  it('keeps the avatar row through the start, typed for the profile', async () => {
    const rows = await strapi.db
      .connection('files_related_mph')
      .where({ related_id: project.users.alice.id, field: 'avatar' });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      file_id: project.ids.file,
      related_type: 'plugin::end-users.profile',
    });
  });

  it('leaves no index named after a users-permissions table on the renamed ones', async () => {
    const names = await inspectDatabase(async (db) => [
      ...(await indexNames(db, 'eu_users')),
      ...(await indexNames(db, 'eu_roles')),
      ...(await indexNames(db, 'eu_users_roles_lnk')),
    ]);

    expect(names.filter((name) => name.startsWith('up_'))).toEqual([]);
  });

  it('records the step', async () => {
    const record = await readRecord(strapi);

    expect(record.status).toBe('completed');
    expect(record.completedSteps).toContain('pre-sync');
    expect(record.cutoverAt).toEqual(expect.any(String));
  });
});

describe('migration from users-permissions: a start that stopped after the renames', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    await resetAfterMigration();
    project = await seedUsersPermissionsProject();

    await inspectDatabase(async (db) => {
      await db.schema.renameTable('up_users', 'eu_users');
      await db.schema.renameTable('up_roles', 'eu_roles');
      await db.schema.renameTable('up_users_role_lnk', 'eu_users_roles_lnk');
      await db('strapi_core_store_settings').insert({
        key: 'plugin_end-users_migration',
        type: 'object',
        environment: null,
        tag: null,
        value: JSON.stringify({
          status: 'in-progress',
          cutoverAt: null,
          attempt: 1,
          startedAt: new Date().toISOString(),
          completedAt: null,
          rolledBackAt: null,
          cleanedUpAt: null,
          completedSteps: [],
          staged: {},
          carried: { defaultRoleDocumentId: null, copied: [], columns: [] },
          rollbackStartedAt: null,
          claim: null,
        }),
      });
    });

    strapi = await migratedInstance(project);
  });

  afterAll(async () => {
    await strapi?.destroy();
    removeProjectTypes();
  });

  it('finishes on the next start when a start stopped after the renames', async () => {
    const alice = await strapi.db
      .connection('eu_users')
      .where({ id: project.users.alice.id })
      .first();
    const record = await readRecord(strapi);

    expect(alice).toMatchObject({
      document_id: project.users.alice.documentId,
      email: 'alice@example.com',
      username: 'alice',
      display_username: 'Alice',
    });
    expect(record.completedSteps).toContain('pre-sync');
    expect(Object.values(record.staged)).toContain('up_users_favorites_lnk');
    expect(
      await strapi.db
        .connection('eu_users')
        .where({ id: project.users.aliceDuplicate.id })
        .first('email')
    ).toEqual({ email: `alice+dup${project.users.aliceDuplicate.id}@users.invalid` });
  });
});

describe('migration from users-permissions: end-users ran beside it first', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    await resetAfterMigration();
    project = await seedUsersPermissionsProject();

    // Both plugins on, nothing asked for: end-users makes its own, empty, tables
    await (await checkInstance(false)).destroy();

    const empty = await inspectDatabase(async (db) => ({
      users: Number((await db('eu_users').count({ c: '*' }).first())?.c),
      kept: Number((await db('up_users').count({ c: '*' }).first())?.c),
    }));

    expect(empty.users).toBe(0);
    expect(empty.kept).toBeGreaterThan(0);

    // A table of the project's own whose name starts with the plugin's prefix
    await inspectDatabase(async (db) => {
      await db.schema.dropTableIfExists('eu_countries');
      await db.schema.createTable('eu_countries', (table) => {
        table.integer('id');
        table.string('name');
      });
      await db('eu_countries').insert({ id: 1, name: 'Norway' });
    });

    strapi = await migratedInstance(project);
  });

  afterAll(async () => {
    await strapi?.destroy();
    await inspectDatabase((db) => db.schema.dropTableIfExists('eu_countries'));
    removeProjectTypes();
  });

  it('leaves a project table that only starts with the plugin prefix, rows and all', async () => {
    expect(await strapi.db.connection('eu_countries').select('id', 'name')).toEqual([
      { id: 1, name: 'Norway' },
    ]);
  });

  it('migrates over the empty end-users tables without losing a user, a role or the memo author', async () => {
    const users = await strapi.db.connection('eu_users').select('id', 'document_id');
    const fixtures = Object.values(project.users);

    expect(users).toHaveLength(fixtures.length);

    for (const user of fixtures) {
      expect(users).toContainEqual({ id: user.id, document_id: user.documentId });
    }

    const roles = await strapi.db.connection('eu_roles').select('id', 'document_id');

    for (const role of Object.values(project.roles)) {
      expect(roles).toContainEqual({ id: role.id, document_id: role.documentId });
    }

    const author = await strapi.db
      .connection('memos_author_lnk')
      .where({ memo_id: project.ids.memo })
      .first();

    expect(author.user_id).toBe(project.users.alice.id);
  });

  it('says in the report that the end-users roles from before were replaced', async () => {
    const report = (await strapi
      .store({ type: 'plugin', name: 'end-users' })
      .get({ key: 'migration-report' })) as { items: Array<{ id: string; severity: string }> };

    expect(report.items).toContainEqual(
      expect.objectContaining({ id: 'compat-note:end-users-tables-replaced', severity: 'info' })
    );
  });
});

describe('migration from users-permissions: after the schema sync', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;

  const fixtures = () => Object.values(project.users);
  const withPassword = () => fixtures().filter((user) => user.password !== null);
  const store = (key: string) => strapi.store({ type: 'plugin', name: 'end-users' }).get({ key });

  const permissionsOf = async (documentId: string) =>
    (
      strapi.plugin('end-users').service('permission') as {
        findForRoles(ids: string[]): Promise<
          Array<{
            action: string;
            subject: string | null;
            properties: { fields?: string[] | null };
            conditions: Array<{ name: string }>;
          }>
        >;
      }
    ).findForRoles([documentId]);

  const counts = async () => ({
    profiles: Number((await strapi.db.connection('eu_profiles').count({ c: '*' }).first())?.c),
    accounts: Number((await strapi.db.connection('eu_accounts').count({ c: '*' }).first())?.c),
    permissions: Number(
      (await strapi.db.connection('eu_permissions').count({ c: '*' }).first())?.c
    ),
  });

  beforeAll(async () => {
    await resetAfterMigration();
    project = await seedUsersPermissionsProject();
    strapi = await migratedInstance(project);
  });

  afterAll(async () => {
    await strapi?.destroy();
    removeProjectTypes();
    await resetDatabase();
  });

  it('gives every user one profile with the same id and the custom values', async () => {
    const profiles = await strapi.db.connection('eu_profiles').select('id', 'company', 'tags');
    const alice = project.users.alice;

    expect(profiles).toHaveLength(fixtures().length);
    expect(profiles).toContainEqual(expect.objectContaining({ id: alice.id, company: 'Acme' }));

    // A JSON array moves as it is stored
    const aliceRow = profiles.find((profile) => profile.id === alice.id);

    expect(typeof aliceRow.tags === 'string' ? JSON.parse(aliceRow.tags) : aliceRow.tags).toEqual([
      'vip',
      'beta',
    ]);

    // Each profile has its own document id, not the user's
    const documents = await strapi.db.connection('eu_profiles').pluck('document_id');
    const userDocuments = await strapi.db.connection('eu_users').pluck('document_id');

    expect(new Set(documents).size).toBe(documents.length);
    expect(documents.filter((id) => userDocuments.includes(id))).toEqual([]);

    for (const user of fixtures()) {
      expect(profiles.map((profile) => profile.id)).toContain(user.id);
    }

    const links = await strapi.db.connection('eu_profiles_user_lnk').select();

    expect(links).toHaveLength(fixtures().length);
    expect(links.every((link) => link.profile_id === link.user_id)).toBe(true);

    const component = await strapi.db
      .connection('eu_profiles_cmps')
      .where({ entity_id: alice.id, field: 'seo' })
      .first();
    const seo = await strapi.db
      .connection('components_shared_seos')
      .where({ id: component.cmp_id })
      .first();

    expect(seo.meta_title).toBe('Alice');

    const organization = await strapi.db
      .connection('eu_profiles_organization_lnk')
      .where({ profile_id: alice.id })
      .first();

    expect(organization.organization_id).toBe(project.ids.organization);

    const avatar = await strapi.db
      .connection('files_related_mph')
      .where({ related_id: alice.id, field: 'avatar', related_type: 'plugin::end-users.profile' });

    expect(avatar.map((row) => row.file_id)).toEqual([project.ids.file]);

    // Copied, so the staged copies are gone; the one the profile does not declare is kept
    const record = await readRecord(strapi);
    const left = await inspectDatabase(async (db) => tablesLike(db, 'eu_stg_'));

    // Enterprise adds the review workflow's two links to the user, so these are included, not all
    const copied = record.carried.copied.map((name) => record.staged[name]);

    expect(copied).toEqual(expect.arrayContaining(['up_users_organization_lnk', 'up_users_cmps']));
    expect(copied).not.toContain('up_users_favorites_lnk');
    expect(left.filter((name) => record.carried.copied.includes(name))).toEqual([]);
    expect(left).toHaveLength(Object.keys(record.staged).length - copied.length);
    expect(Object.values(record.staged)).toContain('up_users_favorites_lnk');
  });

  it('keeps the memo author pointing at the same user', async () => {
    const author = await strapi.db
      .connection('memos_author_lnk')
      .where({ memo_id: project.ids.memo })
      .first();

    expect(author.user_id).toBe(project.users.alice.id);
  });

  it('lists the staged table the profile does not declare', async () => {
    const report = (await store('migration-report')) as {
      items: Array<{ id: string; kind: string; refs?: string[]; count?: number }>;
    };
    const items = report.items.filter((item) => item.kind === 'staged-undeclared');

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ refs: ['up_users_favorites_lnk'], count: 2 });
  });

  it('creates a credential account for each local user and none for the provider user', async () => {
    const accounts = await strapi.db
      .connection('eu_accounts')
      .where({ provider_id: 'credential' })
      .select('account_id', 'user_id', 'password');

    expect(accounts).toHaveLength(withPassword().length);

    for (const user of withPassword()) {
      const account = accounts.find((row) => row.user_id === user.documentId);

      expect(account?.account_id).toBe(user.documentId);
      expect(account?.password).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    }

    expect(accounts.map((row) => row.user_id)).not.toContain(project.users.carol.documentId);
  });

  it('carries confirmed and blocked, and names users after their old username', async () => {
    const row = (key: FixtureUser) =>
      strapi.db.connection('eu_users').where({ id: project.users[key].id }).first();

    expect((await row('bob')).email_verified).toBeFalsy();
    expect((await row('alice')).email_verified).toBeTruthy();
    expect((await row('carol')).email_verified).toBeTruthy();
    expect((await row('dave')).banned).toBeTruthy();
    expect((await row('alice')).banned).toBeFalsy();
    expect((await row('alice')).name).toBe('Alice');
  });

  it('rebuilds role permissions with the fixes', async () => {
    const authenticated = await permissionsOf(project.roles.authenticated.documentId);
    const actions = authenticated.map((permission) => permission.action);
    const update = authenticated.find(
      (permission) => permission.action === 'plugin::end-users.user.update'
    );

    expect(actions).toContain('plugin::end-users.me.find');
    expect(update?.conditions.map((condition) => condition.name)).toEqual([
      'plugin::end-users.is-self',
    ]);
    expect(actions.filter((action) => action === 'api::memo.memo.find')).toHaveLength(1);
    expect(actions).toEqual(
      expect.arrayContaining([
        'plugin::end-users.profile.find',
        'plugin::end-users.profile.findOne',
        'plugin::end-users.profile.update',
      ])
    );
    expect(actions.filter((action) => action.startsWith('plugin::users-permissions.'))).toEqual([]);

    const editors = await permissionsOf(project.roles.editors.documentId);
    const destroy = editors.find(
      (permission) => permission.action === 'plugin::end-users.user.delete'
    );

    expect(destroy?.conditions.map((condition) => condition.name)).toEqual([
      'plugin::end-users.is-self',
    ]);
    expect(editors.map((permission) => permission.action)).toContain('api::memo.memo.update');

    const roles = await strapi.db.connection('eu_roles').select('id', 'type');

    expect(roles.find((role) => role.id === project.roles.editors.id)?.type).toBe('custom');
    expect(roles.find((role) => role.id === project.roles.authenticated.id)?.type).toBe(
      'authenticated'
    );
  });

  it('records the steps', async () => {
    const record = await readRecord(strapi);

    expect(record.completedSteps).toEqual(
      expect.arrayContaining(['pre-sync', 'users', 'roles', 'permissions', 'profiles', 'accounts'])
    );
    expect(record.carried.copied.map((name) => record.staged[name])).toEqual(
      expect.arrayContaining(['up_users_organization_lnk', 'up_users_cmps'])
    );
    expect(record.carried.columns).toEqual(expect.arrayContaining(['company', 'tags']));
    expect((record as any).carried.defaultRoleDocumentId).toBe(
      project.roles.authenticated.documentId
    );
  });

  it('runs every step again with the same counts', async () => {
    const before = await counts();

    // As a start that stopped after the pre-sync leaves it
    await strapi.store({ type: 'plugin', name: 'end-users' }).set({
      key: 'migration',
      value: { ...(await readRecord(strapi)), status: 'in-progress', completedSteps: ['pre-sync'] },
    });
    await strapi.destroy();
    strapi = await migratedInstance(project);

    expect(await counts()).toEqual(before);
    expect((await readRecord(strapi)).completedSteps).toContain('accounts');
  });
});

/**
 * Makes every statement that matches fail, until the returned function is called. Patched on
 * knex's client, since the statements run inside the start (the sync and the bootstrap), where a
 * test has no hook of its own.
 */
const failStatements = (pattern: RegExp): (() => void) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const Client = require('knex/lib/client');
  const original = Client.prototype.query;

  Client.prototype.query = function query(connection: unknown, queryParam: unknown) {
    const sql = typeof queryParam === 'string' ? queryParam : (queryParam as { sql?: string })?.sql;

    if (typeof sql === 'string' && pattern.test(sql)) {
      return Promise.reject(new Error('injected stop'));
    }

    return original.call(this, connection, queryParam);
  };

  return () => {
    Client.prototype.query = original;
  };
};

/** An insert into this table, however the database quotes it: not one that only mentions it */
const insertInto = (table: string): RegExp =>
  new RegExp(`^insert\\s+into\\s+[^\\s(]*\\b${table}\\W?\\s*\\(`, 'i');

describe('migration from users-permissions: a start that stops part way', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi | undefined;

  const counts = async () => {
    const connection = strapi!.db.connection;
    const count = async (table: string) =>
      Number((await connection(table).count({ c: '*' }).first())?.c);

    return {
      users: await count('eu_users'),
      profiles: await count('eu_profiles'),
      accounts: await count('eu_accounts'),
      links: await count('eu_profiles_user_lnk'),
      permissions: await count('eu_permissions'),
    };
  };

  /** A start that fails on a statement, then one that does not */
  const stopAt = async (pattern: RegExp) => {
    const restore = failStatements(pattern);

    try {
      await expect(migratedInstance(project)).rejects.toThrow(/injected stop/);
    } finally {
      restore();
    }

    // A start that stops gives its claim back without waiting for the answer, and the database
    // closing can cut that short: the claim then runs out by itself, which is made to have happened
    await inspectDatabase(async (db) => {
      const stored = await db('strapi_core_store_settings')
        .where('key', 'plugin_end-users_migration')
        .first('value');
      const record = JSON.parse(stored.value);

      if (record.claim) {
        record.claim = { ...record.claim, until: new Date(Date.now() - 1000).toISOString() };
        await db('strapi_core_store_settings')
          .where('key', 'plugin_end-users_migration')
          .update({ value: JSON.stringify(record) });
      }
    });
  };

  beforeAll(async () => {
    await resetAfterMigration();
    project = await seedUsersPermissionsProject();
    strapi = await migratedInstance(project);

    // What an uninterrupted start makes, to compare each resumed one with
    reference = await counts();
    await strapi.destroy();
    strapi = undefined;
  });

  let reference: Awaited<ReturnType<typeof counts>>;

  afterEach(async () => {
    await strapi?.destroy();
    strapi = undefined;
  });

  afterAll(async () => {
    removeProjectTypes();
    await resetDatabase();
  });

  const resumes = async () => {
    await resetAfterMigration();
    project = await seedUsersPermissionsProject();
  };

  const finishes = async () => {
    strapi = await migratedInstance(project);

    expect(await readRecord(strapi)).toMatchObject({ status: 'completed' });
    expect(await counts()).toEqual(reference);

    // One account per user and provider, and one profile per user
    const duplicated = await strapi.db
      .connection('eu_accounts')
      .select('provider_id', 'account_id')
      .groupBy('provider_id', 'account_id')
      .havingRaw('count(*) > 1');

    expect(duplicated).toEqual([]);
  };

  it('finishes on the next start when the staging of the tables stopped', async () => {
    await resumes();
    await stopAt(/^(alter|rename) .*eu_stg_/is);
    await finishes();
  });

  it('finishes on the next start when it stopped after the staging and before the profiles', async () => {
    await resumes();
    await stopAt(insertInto('eu_profiles'));

    const record = await inspectDatabase((db) =>
      db('strapi_core_store_settings').where('key', 'plugin_end-users_migration').first('value')
    );

    expect(JSON.parse(record.value).completedSteps).not.toContain('profiles');
    await finishes();
  });

  it('finishes on the next start when the copy of a staged table stopped', async () => {
    await resumes();
    await stopAt(insertInto('eu_profiles_cmps'));
    await finishes();
  });

  it('finishes on the next start when it stopped between the accounts and the roles', async () => {
    await resumes();
    await stopAt(insertInto('eu_accounts'));
    await finishes();
  });

  it('finishes on the next start when the retyping of the roles stopped', async () => {
    await resumes();
    await stopAt(/^update\s+[^\s(]*eu_roles\W?\s+set\b.*\btype\b/is);
    await finishes();
  });
});
