/**
 * The way back and the end: a rollback while the compatibility mode is on returns the project to
 * Users & Permissions from its state now, and the first start with the mode off cleans up after it.
 */
import { randomBytes } from 'node:crypto';
import { createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import { readRecord } from '../../../../../packages/plugins/end-users/server/src/migration/record';
import { bearer, TEST_PASSWORD } from '../utils/permissions';
import { resetDatabase } from '../utils/reset-database';
import {
  checkInstance,
  forgetMigration,
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
  usersPermissionsInstance,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';

const UP = 'plugin::users-permissions';
const UP_USER = `${UP}.user`;
const MEMO = 'api::memo.memo';

type Row = Record<string, any>;

describe('rollback and cleanup', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi | undefined;
  const changedPassword = `${randomBytes(9).toString('base64url')}Aa1`;
  const ginaPassword = `${randomBytes(9).toString('base64url')}Aa1`;

  const stop = async () => {
    await strapi?.destroy();
    strapi = undefined;
  };

  beforeAll(async () => {
    // What an earlier file's migration left: a link table keyed to the end-users table, and staged tables
    await inspectDatabase(async (db) => {
      await db.schema.dropTableIfExists('memos_author_lnk');

      if (String(db.client.config.client) === 'pg') {
        const { rows } = await db.raw(
          "select tablename as name from pg_tables where schemaname = current_schema() and tablename like 'eu\\_stg\\_%'"
        );

        for (const { name } of rows) {
          // eslint-disable-next-line no-await-in-loop
          await db.raw('drop table if exists ?? cascade', [name]);
        }
      }
    });
    project = await seedUsersPermissionsProject();
    strapi = await migratedInstance(project);

    const rq = createRequest({ strapi });
    const signedIn = await rq.post('/api/auth/local', {
      body: { identifier: 'alice@example.com', password: TEST_PASSWORD },
    });

    expect(signedIn.status).toBe(200);

    // After the cutover: alice changes her password, gina signs up, alice's profile changes and an
    // admin gives Editors one more action
    const changed = await rq.post('/api/auth/change-password', {
      headers: bearer(signedIn.body.jwt),
      body: {
        currentPassword: TEST_PASSWORD,
        password: changedPassword,
        passwordConfirmation: changedPassword,
      },
    });

    expect(changed.status).toBe(200);

    const registered = await rq.post('/api/auth/local/register', {
      body: {
        username: 'gina',
        email: 'gina@example.com',
        password: ginaPassword,
        company: 'Gina Co',
      },
    });

    expect(registered.status).toBe(200);

    await strapi.db
      .connection('eu_profiles')
      .where({ id: project.users.alice.id })
      .update({ company: 'Acme 2' });
    await (
      strapi.plugin('end-users').service('permission') as {
        applyDiff(
          role: string,
          diff: { create: Row[]; update: Row[]; delete: string[] }
        ): Promise<void>;
      }
    ).applyDiff(project.roles.editors.documentId, {
      create: [{ action: `${MEMO}.delete`, subject: null, properties: {}, conditions: [] }],
      update: [],
      delete: [],
    });

    // Erin picks up two more roles, and frank signs in with GitHub and Google as well: end-users
    // holds several of each, users-permissions one
    const erinKey = project.users.erin.id;
    const [primary, second, third] = [
      project.roles.authenticated.id,
      project.roles.editors.id,
      project.roles.editorsLower.id,
    ];

    await strapi.db.connection('eu_users_roles_lnk').insert([
      { user_id: erinKey, role_id: second, role_ord: 2 },
      { user_id: erinKey, role_id: third, role_ord: 3 },
    ]);
    await strapi.db
      .connection('eu_users_roles_lnk')
      .where({ user_id: erinKey, role_id: primary })
      .update({ role_ord: 1 });

    for (const provider of ['github', 'google']) {
      // eslint-disable-next-line no-await-in-loop
      await strapi.db.query('plugin::end-users.account').create({
        data: {
          providerId: provider,
          accountId: `frank-${provider}`,
          userId: project.users.frank.documentId,
        },
      });
    }

    await stop();
  });

  afterAll(async () => {
    await stop();
    await forgetMigration();
    removeProjectTypes();
    await resetDatabase();
  });

  it('stops the start after rolling back and refuses the next start until the switch is reverted', async () => {
    await expect(migratedInstance(project, { migration: { rollback: true } })).rejects.toThrow(
      /migration\.rollback/
    );
    await expect(migratedInstance(project, { migration: { rollback: true } })).rejects.toThrow(
      /migration\.rollback/
    );

    const record = await inspectDatabase((db) =>
      db('strapi_core_store_settings').where('key', 'plugin_end-users_migration').first('value')
    );

    expect(JSON.parse(record.value)).toMatchObject({
      status: 'rolled-back',
      rolledBackAt: expect.any(String),
    });
  });

  describe('on users-permissions again', () => {
    let up: Core.Strapi;

    beforeAll(async () => {
      up = await usersPermissionsInstance();
    });

    afterAll(async () => {
      await up?.destroy();
    });

    it('signs alice in through users-permissions with the password she set after the migration', async () => {
      const res = await createRequest({ strapi: up }).post('/api/auth/local', {
        body: { identifier: 'alice@example.com', password: changedPassword },
      });

      expect(res.status).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
    });

    it('signs alice in with the username spelling she signed up with', async () => {
      const res = await createRequest({ strapi: up }).post('/api/auth/local', {
        body: { identifier: 'Alice', password: changedPassword },
      });

      expect(res.status).toBe(200);
    });

    it('brings back every user, the new one included, with their custom data', async () => {
      const populate = ['role', 'seo', 'avatar', 'organization', 'favorites'];
      const users = (await up.db.connection('up_users').count({ c: '*' }).first()) as Row;

      // The seeded users and the one who signed up after the cutover
      expect(Number(users.c)).toBe(Object.keys(project.users).length + 1);

      const alice = (await up.documents(UP_USER).findOne({
        documentId: project.users.alice.documentId,
        populate,
      })) as Row;

      expect(alice).toMatchObject({ company: 'Acme 2', seo: { metaTitle: 'Alice' } });
      expect(alice.avatar.id).toBe(project.ids.file);
      expect(alice.organization.name).toBe('Acme');
      expect(alice.favorites).toHaveLength(2);
      expect(alice.role.type).toBe('authenticated');

      const memo = (await up.db.query(MEMO).findOne({
        where: { id: project.ids.memo },
        populate: ['author'],
      })) as Row;

      expect(memo.author.id).toBe(project.users.alice.id);

      const [gina] = (await up.documents(UP_USER).findMany({
        filters: { email: 'gina@example.com' },
        populate: ['role'],
      })) as Row[];
      const stored = await up.db.connection('up_users').where({ id: gina.id }).first();

      expect(gina).toMatchObject({ company: 'Gina Co', provider: 'local' });
      expect(gina.role.type).toBe('authenticated');
      expect(stored.password).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    });

    it('takes a user with several roles back with the first, and one with linked providers back with the password', async () => {
      const erinRoles = await up.db
        .connection('up_users_role_lnk')
        .where({ user_id: project.users.erin.id });

      expect(erinRoles.map((link) => link.role_id)).toEqual([project.roles.authenticated.id]);

      // One role each, so the link table holds one row per user
      const links = (await up.db.connection('up_users_role_lnk').count({ c: '*' }).first()) as Row;
      const users = (await up.db.connection('up_users').count({ c: '*' }).first()) as Row;

      expect(Number(links.c)).toBe(Number(users.c));

      const frank = await up.db
        .connection('up_users')
        .where({ id: project.users.frank.id })
        .first();

      expect(frank.provider).toBe('local');
      expect(frank.password).toEqual(expect.stringMatching(/^\$2[aby]\$/));
    });

    it('restores the role permissions as they were at the cutover', async () => {
      const actions = (
        (await up.db.query(`${UP}.permission`).findMany({
          where: { role: project.roles.editors.id },
        })) as Row[]
      ).map((permission) => permission.action);

      expect(actions).toEqual(expect.arrayContaining([`${MEMO}.update`, `${UP}.user.destroy`]));
      expect(actions).not.toContain(`${MEMO}.delete`);
    });

    it('gives the Editor admin role its users-permissions actions back', async () => {
      const editor = await up.db.query('admin::role').findOne({ where: { code: 'strapi-editor' } });
      const rows = (await up.db
        .query('admin::permission')
        .findMany({ where: { role: editor.id } })) as Row[];
      const actions = rows.map((row) => row.action);
      const explorer = rows.find(
        (row) => row.action === 'plugin::content-manager.explorer.read' && row.subject === UP_USER
      );

      expect(actions).toEqual(expect.arrayContaining([`${UP}.roles.read`, `${UP}.providers.read`]));
      expect(actions.filter((action) => action.startsWith('plugin::end-users.'))).toEqual([]);
      expect(explorer?.properties.fields).toEqual(
        expect.arrayContaining(['username', 'email', 'company'])
      );
      expect(rows.filter((row) => row.subject === 'plugin::end-users.profile')).toEqual([]);
    });

    it('creates a new user through users-permissions', async () => {
      // The register route also sends the confirmation email, which this app has no provider for
      const created = await up.plugin('users-permissions').service('user').add({
        username: 'hank',
        email: 'hank@example.com',
        provider: 'local',
        password: ginaPassword,
        confirmed: true,
        role: project.roles.authenticated.documentId,
      });

      expect(created.id).toEqual(expect.any(Number));

      const res = await createRequest({ strapi: up }).post('/api/auth/local', {
        body: { identifier: 'hank', password: ginaPassword },
      });

      expect(res.status).toBe(200);
    });
  });

  it('starts in check mode again once the rollback is done', async () => {
    const check = await checkInstance();

    try {
      expect(
        Object.keys(check.contentTypes).filter((uid) => uid.startsWith('plugin::end-users'))
      ).toEqual([]);
    } finally {
      await check.destroy();
    }
  });

  it('migrates again as a second attempt', async () => {
    strapi = await migratedInstance(project);

    expect(await readRecord(strapi)).toMatchObject({ status: 'completed', attempt: 2 });

    const names = await inspectDatabase((db) =>
      db('strapi_migrations_internal')
        .where('name', 'like', 'end-users-from-users-permissions%')
        .pluck('name')
    );

    expect(names).toEqual(
      expect.arrayContaining([
        'end-users-from-users-permissions-1',
        'end-users-from-users-permissions-2',
      ])
    );

    await stop();
  });

  const patchRecord = (patch: Record<string, unknown>) =>
    inspectDatabase(async (db) => {
      const row = await db('strapi_core_store_settings')
        .where('key', 'plugin_end-users_migration')
        .first('value');

      await db('strapi_core_store_settings')
        .where('key', 'plugin_end-users_migration')
        .update({ value: JSON.stringify({ ...JSON.parse(row.value), ...patch }) });
    });

  it('refuses to start after an interrupted rollback unless migration.rollback is set', async () => {
    await patchRecord({ rollbackStartedAt: new Date().toISOString() });

    await expect(migratedInstance(project)).rejects.toThrow(
      /a rollback was interrupted; set migration\.rollback: true to finish it/
    );
  });

  it('finishes that rollback, and rolls back a migration that never reached its end', async () => {
    await patchRecord({ status: 'in-progress', completedSteps: ['pre-sync', 'users'] });

    await expect(migratedInstance(project, { migration: { rollback: true } })).rejects.toThrow(
      /rolled back/
    );

    const record = await inspectDatabase((db) =>
      db('strapi_core_store_settings').where('key', 'plugin_end-users_migration').first('value')
    );

    expect(JSON.parse(record.value)).toMatchObject({
      status: 'rolled-back',
      rollbackStartedAt: null,
    });
  });

  it('migrates a third attempt after that', async () => {
    strapi = await migratedInstance(project);

    expect(await readRecord(strapi)).toMatchObject({ status: 'completed', attempt: 3 });

    await stop();
  });

  it('cleans up on the first start with compat off and refuses a rollback after it', async () => {
    strapi = await migratedInstance(project, {
      instance: { pluginConfig: { compat: { usersPermissions: false } } },
    });

    const record = await readRecord(strapi);
    const staged = Object.entries(record.staged);
    const stagedOf = (original: string) => staged.find(([, from]) => from === original)?.[0];

    expect(record).toMatchObject({ cleanedUpAt: expect.any(String) });

    const state = await inspectDatabase(async (db) => ({
      permissions: await db.schema.hasTable(stagedOf('up_permissions')!),
      links: await db.schema.hasTable(stagedOf('up_permissions_role_lnk')!),
      favorites: await db.schema.hasTable(stagedOf('up_users_favorites_lnk')!),
      password: await db.schema.hasColumn('eu_users', 'password'),
      company: await db.schema.hasColumn('eu_users', 'company'),
      userOrder: await db.schema.hasColumn('eu_users_roles_lnk', 'user_ord'),
    }));

    expect(state).toEqual({
      permissions: false,
      links: false,
      favorites: true,
      password: false,
      company: false,
      userOrder: false,
    });

    await stop();
    await expect(migratedInstance(project, { migration: { rollback: true } })).rejects.toThrow(
      /backup/
    );
  });
});
