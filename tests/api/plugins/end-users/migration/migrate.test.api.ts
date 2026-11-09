/**
 * The data move's file: the start control here, the migration itself in the cases that follow.
 */
import {
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';

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
});
