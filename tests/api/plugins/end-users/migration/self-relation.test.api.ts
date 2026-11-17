/**
 * A relation from the Users & Permissions user to the user itself (friends): its link table names
 * the two sides `user_id` and `inv_user_id`, the profile's `profile_id` and `user_id`. Every link
 * has to arrive on the right side, and the rollback has to give the table its two columns back.
 */
import type { Core } from '@strapi/types';

import {
  forgetMigration,
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
  useFriendsRelation,
  usersPermissionsInstance,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';
import { resetDatabase } from '../utils/reset-database';

const UP_USER = 'plugin::users-permissions.user';

type Pair = [number, number];

const sorted = (pairs: Pair[]): Pair[] => [...pairs].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

describe('migration from users-permissions: a relation from the user to the user', () => {
  let project: UsersPermissionsProject;
  let pairs: Pair[];

  beforeAll(async () => {
    useFriendsRelation();
    project = await seedUsersPermissionsProject();

    const { alice, bob, carol, dave } = project.users;
    const friends: Array<[number, number[]]> = [
      [alice.id, [bob.id, carol.id]],
      [bob.id, [alice.id, dave.id]],
    ];

    pairs = sorted(friends.flatMap(([id, ids]) => ids.map((other): Pair => [id, other])));

    const up = await usersPermissionsInstance();

    try {
      for (const [id, ids] of friends) {
        // eslint-disable-next-line no-await-in-loop
        await up.db.query(UP_USER).update({ where: { id }, data: { friends: ids } });
      }
    } finally {
      await up.destroy();
    }
  });

  afterAll(async () => {
    useFriendsRelation(false);
    await forgetMigration();
    removeProjectTypes();
    await resetDatabase();
  });

  it('carries each user’s links to the profile, two per user, to the right side', async () => {
    const strapi: Core.Strapi = await migratedInstance(project);

    try {
      const rows = await strapi.db.connection('eu_profiles_friends_lnk').select();

      expect(sorted(rows.map((row) => [Number(row.profile_id), Number(row.user_id)]))).toEqual(
        pairs
      );
    } finally {
      await strapi.destroy();
    }
  });

  it('gives Users & Permissions its link table back with both sides, as it was', async () => {
    await expect(migratedInstance(project, { migration: { rollback: true } })).rejects.toThrow(
      /rolled back/
    );

    const rows = await inspectDatabase((db) => db('up_users_friends_lnk').select());

    expect(sorted(rows.map((row) => [Number(row.user_id), Number(row.inv_user_id)]))).toEqual(
      pairs
    );
  });
});
