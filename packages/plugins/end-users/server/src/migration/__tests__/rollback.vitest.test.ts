import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@strapi/database';

import { updateRecord } from '../record';
import { leftoverColumns, reverseAdminAction, runRollback, upRoleType } from '../rollback';
import { pendingLinkIdentifier } from '../../utils/pending-link';

const UP = 'plugin::users-permissions';
const EU = 'plugin::end-users';

describe('reverseAdminAction', () => {
  it('maps end-users admin actions back and leaves the email templates read alone', () => {
    expect(reverseAdminAction(`${EU}.roles.read`)).toBe(`${UP}.roles.read`);
    expect(reverseAdminAction(`${EU}.roles.delete`)).toBe(`${UP}.roles.delete`);
    expect(reverseAdminAction(`${EU}.providers.update`)).toBe(`${UP}.providers.update`);
    expect(reverseAdminAction(`${EU}.settings.read`)).toBe(`${UP}.advanced-settings.read`);
    expect(reverseAdminAction(`${EU}.settings.update`)).toBe(`${UP}.advanced-settings.update`);
    expect(reverseAdminAction('plugin::email.templates.read')).toBeNull();
    expect(reverseAdminAction(`${EU}.something.else`)).toBeNull();
  });
});

describe('upRoleType', () => {
  it('builds a role type from the name and suffixes a clash', () => {
    const taken = new Set<string>(['public', 'authenticated']);

    expect(upRoleType('Content Editors', taken)).toBe('content_editors');

    taken.add('content_editors');

    expect(upRoleType('Content Editors', taken)).toBe('content_editors_2');
    expect(upRoleType('  Wéb / Team! ', taken)).toBe('web_team');
    expect(upRoleType('!!!', taken)).toBe('role');
  });
});

describe('leftoverColumns', () => {
  const db = {
    metadata: {
      values: () => [
        {
          tableName: 'eu_users',
          attributes: {
            id: { type: 'increments', columnName: 'id' },
            email: { type: 'string', columnName: 'email' },
            createdBy: { type: 'relation', joinColumn: { name: 'created_by_id' } },
            roles: { type: 'relation', joinTable: { name: 'eu_users_roles_lnk' } },
          },
        },
      ],
    },
  } as unknown as Database;

  it('lists the columns a table holds that its model does not declare', () => {
    expect(
      leftoverColumns(db, 'eu_users', ['id', 'email', 'created_by_id', 'company', 'password'])
    ).toEqual(['company', 'password']);
  });

  it('lists nothing for a table no model owns', () => {
    expect(leftoverColumns(db, 'eu_stg_1', ['id', 'anything'])).toEqual([]);
  });
});

/* -------------------------------------------------------------------------------------------------
 * The step, on an in-memory SQLite
 * -----------------------------------------------------------------------------------------------*/

const USER_UID = 'plugin::end-users.user';
const PROFILE_UID = 'plugin::end-users.profile';
const ACCOUNT_UID = 'plugin::end-users.account';
const VERIFICATION_UID = 'plugin::end-users.verification';

type Row = Record<string, any>;

let record: Record<string, any>;

vi.mock('../record', () => ({
  readRecord: vi.fn(async () => record),
  updateRecord: vi.fn(async (_strapi: unknown, patch: Record<string, unknown>) => {
    Object.assign(record, patch);
  }),
}));

const col = (columnName: string) => ({ type: 'string', columnName });

const models = [
  {
    tableName: 'eu_users',
    attributes: {
      id: col('id'),
      documentId: col('document_id'),
      email: col('email'),
      username: col('username'),
      displayUsername: col('display_username'),
      emailVerified: col('email_verified'),
      banned: col('banned'),
      roles: {
        type: 'relation',
        joinTable: {
          name: 'eu_users_roles_lnk',
          joinColumn: { name: 'user_id' },
          inverseJoinColumn: { name: 'role_id' },
          orderColumnName: 'role_ord',
        },
      },
    },
  },
  {
    tableName: 'eu_profiles',
    attributes: {
      id: col('id'),
      company: col('company'),
      user: {
        type: 'relation',
        joinTable: {
          name: 'eu_profiles_user_lnk',
          joinColumn: { name: 'profile_id' },
          inverseJoinColumn: { name: 'user_id' },
        },
      },
    },
  },
  {
    tableName: 'eu_accounts',
    attributes: {
      providerId: col('provider_id'),
      userId: col('user_id'),
      accountId: col('account_id'),
    },
  },
  {
    tableName: 'eu_verifications',
    attributes: { identifier: col('identifier'), value: col('value') },
  },
];

const byUid: Record<string, unknown> = {
  [USER_UID]: models[0],
  [PROFILE_UID]: models[1],
  [ACCOUNT_UID]: models[2],
  [VERIFICATION_UID]: models[3],
};

/** A project that migrated: tables under the names `renamed` says, three users, one admin role */
const project = async (renamed: boolean, permissions: Row[]) => {
  // knex is Strapi's own database layer (hoisted); the test runs it on an in-memory SQLite
  const knex = (await import('knex')).default({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  const [users, roles, link] = renamed
    ? ['up_users', 'up_roles', 'up_users_role_lnk']
    : ['eu_users', 'eu_roles', 'eu_users_roles_lnk'];

  await knex.schema.createTable(users, (t) => {
    t.increments('id');
    t.string('document_id');
    t.string('email');
    t.string('username');
    t.string('display_username');
    t.boolean('email_verified');
    t.boolean('banned');
    t.boolean('confirmed');
    t.boolean('blocked');
    t.string('provider');
    t.string('company');
  });
  await knex.schema.createTable(roles, (t) => {
    t.increments('id');
    t.string('name');
    t.string('type');
  });
  await knex.schema.createTable(link, (t) => {
    t.increments('id');
    t.integer('user_id');
    t.integer('role_id');
    t.float('role_ord');
  });
  await knex.schema.createTable('eu_profiles', (t) => {
    t.increments('id');
    t.string('company');
  });
  await knex.schema.createTable('eu_profiles_user_lnk', (t) => {
    t.integer('profile_id');
    t.integer('user_id');
  });
  await knex.schema.createTable('eu_accounts', (t) => {
    t.increments('id');
    t.string('provider_id');
    t.string('user_id');
    t.string('account_id');
  });

  await knex(users).insert([
    {
      id: 1,
      document_id: 'd1',
      email: 'a@x.test',
      username: 'alice',
      display_username: 'Alice',
      email_verified: true,
      banned: false,
      company: 'old',
    },
    {
      id: 2,
      document_id: 'd2',
      email: 'b@x.test',
      username: 'bob',
      display_username: 'Bob',
      email_verified: false,
      banned: true,
    },
    { id: 3, document_id: 'd3', email: 'c@x.test', username: 'Carl', display_username: 'carl' },
  ]);
  await knex(roles).insert([
    { id: 1, name: 'Authenticated', type: 'authenticated' },
    { id: 2, name: 'Content Editors', type: 'custom' },
  ]);
  await knex(link).insert([
    { user_id: 1, role_id: 1, role_ord: 1 },
    { user_id: 1, role_id: 2, role_ord: 2 },
    { user_id: 2, role_id: 2, role_ord: 1 },
  ]);
  await knex('eu_profiles').insert([
    { id: 1, company: 'new' },
    { id: 2, company: 'b' },
  ]);
  await knex('eu_profiles_user_lnk').insert([
    { profile_id: 1, user_id: 1 },
    { profile_id: 2, user_id: 2 },
  ]);
  await knex('eu_accounts').insert({ provider_id: 'credential', user_id: 'd1', account_id: 'd1' });
  await knex.schema.createTable('eu_verifications', (t) => {
    t.increments('id');
    t.string('identifier');
    t.string('value');
  });
  // Carl signed up with GitHub and never signed in since; the other row is the engine's own
  await knex('eu_verifications').insert([
    { identifier: pendingLinkIdentifier('github', 'c@x.test', 'a-key'), value: 'd3' },
    { identifier: 'provider-session-github-s1', value: 's1' },
  ]);

  const logs: string[] = [];
  const table = (name: string) => (name === 'admin::permission' ? permissions : []);
  const strapi = {
    log: { info: (line: string) => logs.push(line) },
    plugin: () => undefined,
    contentTypes: {
      [PROFILE_UID]: { attributes: { user: { type: 'relation' }, company: { type: 'string' } } },
    },
    db: {
      query: (name: string) => ({
        findMany: async ({ where }: Row) =>
          table(name).filter(
            (row) =>
              (!where.action?.$startsWith || row.action.startsWith(where.action.$startsWith)) &&
              (where.subject === undefined || row.subject === where.subject)
          ),
        findOne: async ({ where }: Row) =>
          table(name).find(
            (row) =>
              row.action === where.action &&
              (row.subject ?? null) === (where.subject ?? null) &&
              row.role?.id === where.role
          ) ?? null,
        async update({ where, data }: Row) {
          Object.assign(
            table(name).find((row) => row.id === where.id)!,
            data
          );
        },
        async delete({ where }: Row) {
          permissions.splice(
            permissions.findIndex((row) => row.id === where.id),
            1
          );
        },
      }),
    },
  };
  const db = {
    dialect: {
      client: 'sqlite',
      canRenameSchemaObjects: () => false,
      dropSchemaObject: async () => false,
    },
    metadata: {
      get: (uid: string) => byUid[uid],
      values: () => models,
      naming: { joinTableName: (a: string, b: string) => `${a}_${b}_lnk` },
    },
    getSchemaName: () => null,
    getSchemaConnection: (trx: any) => trx.schema,
    schema: {
      async renameTable(trx: any, { from, to }: Row) {
        await trx.schema.renameTable(from, to);

        return true;
      },
    },
  } as unknown as Database;

  // The step reads the metadata from `strapi.db` as well
  Object.assign(strapi.db, db);

  return { knex, db, strapi, logs, ctx: { strapi, owner: 'me', now: () => new Date(0) } as never };
};

const snapshot = async (knex: any) => ({
  users: await knex('up_users').orderBy('id').select(),
  roles: await knex('up_roles').orderBy('id').select(),
  links: await knex('up_users_role_lnk').orderBy('id').select(),
});

describe('runRollback', () => {
  beforeEach(() => {
    vi.mocked(updateRecord).mockClear();
    record = {
      status: 'completed',
      claim: { by: 'me' },
      staged: {},
      carried: { copied: [] },
      completedSteps: ['pre-sync', 'users', 'roles'],
    };
  });

  it('restores spelling, roles and profile values, and leaves the same state when run again after the renames', async () => {
    // As MySQL leaves it when a start stops after the renames: they are done, nothing else is
    const { knex, db, ctx } = await project(true, []);

    await runRollback(knex as never, db, ctx);

    const first = await snapshot(knex);

    record.status = 'completed';
    record.claim = { by: 'me' };
    await runRollback(knex as never, db, ctx);

    expect(await snapshot(knex)).toEqual(first);
    expect(
      first.users.map((user: Row) => [user.username, user.company, user.confirmed, user.blocked])
    ).toEqual([
      ['Alice', 'new', 1, 0],
      ['Bob', 'b', 0, 1],
      // a username that is not the lower case of its display name is left as it is
      ['Carl', null, 0, 0],
    ]);
    expect(first.users[0].provider).toBe('local');
    expect(first.roles.map((role: Row) => role.type)).toEqual(['authenticated', 'content_editors']);
    expect(first.links.map((link: Row) => [link.user_id, link.role_id])).toEqual([
      [1, 1],
      [2, 2],
    ]);
    await knex.destroy();
  });

  it('drops the pending links of provider users, and nothing else the engine keeps', async () => {
    const { knex, db, ctx } = await project(false, []);

    await runRollback(knex as never, db, ctx);

    expect(await knex('eu_verifications').select('identifier')).toEqual([
      { identifier: 'provider-session-github-s1' },
    ]);
    await knex.destroy();
  });

  it('marks the rollback as started before it changes a table, and clears the mark when it is done', async () => {
    const { knex, db, ctx } = await project(false, []);

    await runRollback(knex as never, db, ctx);

    const patches = vi.mocked(updateRecord).mock.calls.map((call) => call[1]);

    expect(Object.keys(patches[0])).toEqual(['rollbackStartedAt']);
    expect(patches[0].rollbackStartedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(patches.at(-1)).toMatchObject({ status: 'rolled-back', rollbackStartedAt: null });
    expect(await knex.schema.hasTable('up_users')).toBe(true);
    await knex.destroy();
  });

  it('rolls back a migration that stopped before the profiles and accounts existed', async () => {
    const { knex, db, ctx } = await project(true, []);

    await knex.schema.dropTable('eu_profiles_user_lnk');
    await knex.schema.dropTable('eu_profiles');
    await knex.schema.dropTable('eu_accounts');
    record.status = 'in-progress';

    await runRollback(knex as never, db, ctx);

    expect(record.status).toBe('rolled-back');
    expect(
      (await knex('up_users').orderBy('id').select('username')).map((u: Row) => u.username)
    ).toEqual(['Alice', 'Bob', 'Carl']);
    await knex.destroy();
  });

  it('leaves confirmed, blocked and the role types alone when the users and roles steps never ran', async () => {
    const { knex, db, ctx } = await project(true, []);

    await knex('up_users').where({ id: 1 }).update({ confirmed: false, blocked: true });
    await knex('up_users').where({ id: 2 }).update({ confirmed: true, blocked: false });
    await knex('up_roles').where({ id: 2 }).update({ type: 'content_team' });
    record.status = 'in-progress';
    record.completedSteps = ['pre-sync'];

    await runRollback(knex as never, db, ctx);

    const users = await knex('up_users').orderBy('id').select('id', 'confirmed', 'blocked');

    expect(users.map((u: Row) => [u.confirmed, u.blocked])).toEqual([
      [0, 1],
      [1, 0],
      [null, null],
    ]);
    expect((await knex('up_roles').where({ id: 2 }).first()).type).toBe('content_team');
    expect(record.status).toBe('rolled-back');
    await knex.destroy();
  });

  it('keeps a migrated username when another user already holds the original spelling', async () => {
    const { knex, db, ctx, logs } = await project(false, []);

    await knex('eu_users').insert({
      id: 4,
      document_id: 'd4',
      email: 'd@x.test',
      username: 'Alice',
    });
    await runRollback(knex as never, db, ctx);

    expect((await knex('up_users').where({ id: 1 }).first()).username).toBe('alice');
    expect(logs.some((line) => line.includes('ids 1'))).toBe(true);
    await knex.destroy();
  });

  const explorer = (id: number, subject: string, extra: Row) => ({
    id,
    action: 'plugin::content-manager.explorer.read',
    subject,
    role: { id: 7 },
    conditions: [],
    properties: { fields: ['username'] },
    ...extra,
  });

  it('merges profile fields into the user row only when conditions and properties match', async () => {
    const permissions = [
      explorer(1, 'plugin::end-users.user', {}),
      explorer(2, 'plugin::end-users.profile', { properties: { fields: ['company'] } }),
    ];
    const { knex, db, ctx } = await project(false, permissions);

    await runRollback(knex as never, db, ctx);

    expect(permissions).toHaveLength(1);
    expect(permissions[0]).toMatchObject({
      subject: 'plugin::users-permissions.user',
      properties: { fields: ['username', 'company'] },
    });
    await knex.destroy();
  });

  it('never widens the user row: other conditions leave it as it is, drop the profile row and log it', async () => {
    const permissions = [
      explorer(1, 'plugin::end-users.user', {}),
      explorer(2, 'plugin::end-users.profile', {
        properties: { fields: ['company'] },
        conditions: ['admin::is-creator'],
      }),
    ];
    const { knex, db, ctx, logs } = await project(false, permissions);

    await runRollback(knex as never, db, ctx);

    expect(permissions).toHaveLength(1);
    expect(permissions[0].properties.fields).toEqual(['username']);
    expect(logs.filter((line) => line.includes('not merged'))).toHaveLength(1);
    expect(logs.find((line) => line.includes('not merged'))).toContain('company');
    await knex.destroy();
  });
});
