/**
 * The data move's file: the start control here, the migration itself in the cases that follow.
 */
import {
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { Core } from '@strapi/types';
import type { FixtureUser, UsersPermissionsProject } from '../utils/users-permissions-project';

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
      const client = String(db.client.config.client);
      const listing = client.includes('sqlite')
        ? await db.raw(
            "select name from sqlite_master where type = 'table' and name like 'eu_stg_%'"
          )
        : await db.raw(
            "select table_name as name from information_schema.tables where table_name like 'eu\\_stg\\_%'"
          );
      const stagingTables = (Array.isArray(listing) ? listing : (listing.rows ?? listing[0]))
        .length;

      return {
        users: Number((await db('up_users').count({ c: '*' }).first())?.c),
        stagingTables,
      };
    });

    expect(state).toEqual({ users: 8, stagingTables: 0 });
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

    expect(state.users).toBe(8 - (mysql ? 1 : 0));
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

/** The names of a table's indexes, whatever the database */
const indexNames = async (db: any, table: string): Promise<string[]> => {
  const client = String(db.client.config.client);
  const raw = client.includes('pg')
    ? await db.raw(
        'select indexname as name from pg_indexes where schemaname = current_schema() and tablename = ?',
        [table]
      )
    : client.includes('mysql')
      ? await db.raw(
          'select index_name as name from information_schema.statistics where table_schema = database() and table_name = ?',
          [table]
        )
      : await db.raw('pragma index_list(??)', [table]);

  return rowsOf(client, raw).map((row) => String(row.name));
};

const tablesLike = async (db: any, prefix: string): Promise<string[]> => {
  const client = String(db.client.config.client);
  const pattern = `${prefix.replace(/_/g, '\\_')}%`;
  const raw = client.includes('pg')
    ? await db.raw(
        'select tablename as name from pg_tables where schemaname = current_schema() and tablename like ?',
        [pattern]
      )
    : client.includes('mysql')
      ? await db.raw(
          'select table_name as name from information_schema.tables where table_schema = database() and table_name like ?',
          [pattern]
        )
      : await db.raw(
          "select name from sqlite_master where type = 'table' and name like ? escape '\\'",
          [pattern]
        );

  return rowsOf(client, raw).map((row) => String(row.name));
};

const readRecord = (strapi: Core.Strapi) =>
  strapi.store({ type: 'plugin', name: 'end-users' }).get({ key: 'migration' }) as Promise<{
    status: string;
    cutoverAt: string | null;
    completedSteps: string[];
    staged: Record<string, string>;
    attempt: number;
  }>;

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

    expect(state.staging.sort()).toEqual(Object.keys(record.staged).sort());
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

    expect(record.status).toBe('in-progress');
    expect(record.completedSteps).toContain('pre-sync');
    expect(record.cutoverAt).toEqual(expect.any(String));
  });
});

describe('migration from users-permissions: a start that stopped after the renames', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    // The start before left a link table whose key points at the end-users table, which is gone:
    // the project is seeded again on a table that is made anew
    await inspectDatabase(async (db) => {
      await db.schema.dropTableIfExists('memos_author_lnk');

      // Staged tables hold keys to each other: Postgres drops them together
      if (String(db.client.config.client) === 'pg') {
        for (const table of await tablesLike(db, 'eu_stg_')) {
          // eslint-disable-next-line no-await-in-loop
          await db.raw('drop table if exists ?? cascade', [table]);
        }
      }
    });
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
          carried: { defaultRoleDocumentId: null, copied: [] },
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
