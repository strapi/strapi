/**
 * A migration and a rollback at the size of a large project, timed. Off unless
 * `END_USERS_REHEARSAL_USERS` is set (the number of users to add to the seeded project):
 *
 *   END_USERS_REHEARSAL_USERS=100000 yarn test:api tests/api/plugins/end-users/migration/rehearsal.test.api.ts
 *
 * The times it prints are the ones the README and the report's estimate are built from.
 */
import { randomBytes } from 'node:crypto';
import type { Knex } from 'knex';

import { resetDatabase } from '../utils/reset-database';
import {
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';

const USERS = Number(process.env.END_USERS_REHEARSAL_USERS ?? 0);
/** SQLite refuses more than 500 rows in one insert (a compound select), and 1,000 is fine elsewhere */
const batchSize = (db: Knex) => (String(db.client.config.client).includes('sqlite') ? 500 : 1000);
const UP_USER = 'plugin::users-permissions.user';

type Row = Record<string, any>;

const count = async (db: Knex, table: string, where: Row = {}): Promise<number> =>
  Number((await db(table).where(where).count({ c: '*' }).first())?.c);

/** Users, users with a password, and avatar rows, in the tables of whichever plugin owns the users */
const tally = (db: Knex, users: string, owner: string): Promise<number[]> =>
  Promise.all([
    count(db, users),
    db(users)
      .whereNotNull('password')
      .count({ c: '*' })
      .first()
      .then((row) => Number(row?.c)),
    count(db, 'files_related_mph', { related_type: owner, field: 'avatar' }),
  ]);

/** Adds `total` users to the seeded project, 1,000 to a statement (500 on SQLite), each like alice's row */
const addUsers = async (db: Knex, project: UsersPermissionsProject, total: number) => {
  const bcrypt = await import('bcryptjs');
  // One hash for all of them: hashing 100,000 passwords would be most of the run
  const password = bcrypt.hashSync(randomBytes(12).toString('base64url'), 10);
  const alice = project.users.alice;
  const template = (await db('up_users').where({ id: alice.id }).first()) as Row;
  const roleLink = (await db('up_users_role_lnk').where({ user_id: alice.id }).first()) as Row;
  const mediaLink = (await db('files_related_mph')
    .where({ related_id: alice.id, related_type: UP_USER, field: 'avatar' })
    .first()) as Row;
  const first = Number((await db('up_users').max({ m: 'id' }).first())?.m) + 1;

  const batch = batchSize(db);

  for (let from = 0; from < total; from += batch) {
    const size = Math.min(batch, total - from);
    const users: Row[] = [];
    const roles: Row[] = [];
    const media: Row[] = [];

    for (let offset = 0; offset < size; offset += 1) {
      const n = from + offset;
      const id = first + n;

      users.push({
        ...template,
        id,
        document_id: randomBytes(12).toString('hex'),
        username: `rehearsal-${n}`,
        email: `rehearsal-${n}@example.test`,
        password,
        provider: 'local',
        confirmed: true,
        blocked: false,
        company: `Company ${n % 500}`,
        confirmation_token: null,
        reset_password_token: null,
      });
      roles.push({ ...roleLink, id: undefined, user_id: id });

      if (n % 10 === 0) {
        media.push({ ...mediaLink, id: undefined, related_id: id });
      }
    }

    // eslint-disable-next-line no-await-in-loop
    await db('up_users').insert(users);
    // eslint-disable-next-line no-await-in-loop
    await db('up_users_role_lnk').insert(roles.map(({ id, ...rest }) => rest));

    if (media.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await db('files_related_mph').insert(media.map(({ id, ...rest }) => rest));
    }
  }

  if (String(db.client.config.client) === 'pg') {
    await db.raw(
      "select setval(pg_get_serial_sequence('up_users', 'id'), (select max(id) from up_users))"
    );
  }
};

const CLIENT_NAMES: Record<string, string> = {
  'better-sqlite3': 'sqlite',
  pg: 'postgres',
  mysql2: 'mysql',
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

(USERS > 0 ? describe : describe.skip)(`rehearsal: ${USERS} users`, () => {
  jest.setTimeout(2 * 60 * 60 * 1000);

  let project: UsersPermissionsProject;
  let before: number[];
  let migrateMs = 0;
  let rollbackMs = 0;
  let client = '';

  beforeAll(async () => {
    project = await seedUsersPermissionsProject();
    await inspectDatabase(async (db) => {
      client = String(db.client.config.client);
      await addUsers(db, project, USERS);
      before = await tally(db, 'up_users', UP_USER);
    });
  });

  afterAll(async () => {
    removeProjectTypes();
    await resetDatabase();
  });

  it('migrates the users, and rolls them back, with every row accounted for', async () => {
    const started = Date.now();
    const strapi = await migratedInstance(project);

    migrateMs = Date.now() - started;

    // eslint-disable-next-line no-console
    console.log(`rehearsal: migrated start ${seconds(migrateMs)}`);

    try {
      const migrated = await inspectDatabase((db) =>
        tally(db, 'eu_users', 'plugin::end-users.profile')
      );
      const profiles = await inspectDatabase((db) => count(db, 'eu_profiles'));
      const accounts = await inspectDatabase((db) =>
        count(db, 'eu_accounts', { provider_id: 'credential' })
      );

      expect(migrated[0]).toBe(before[0]);
      expect(profiles).toBe(before[0]);
      expect(accounts).toBe(before[1]);
      expect(migrated[2]).toBe(before[2]);
    } finally {
      await strapi.destroy();
    }

    const rollingBack = Date.now();

    // The start that rolls back stops itself once it has
    await expect(migratedInstance(project, { migration: { rollback: true } })).rejects.toThrow(
      /migration\.rollback/
    );
    rollbackMs = Date.now() - rollingBack;

    const after = await inspectDatabase((db) => tally(db, 'up_users', UP_USER));

    expect(after).toEqual(before);

    // eslint-disable-next-line no-console
    console.log(
      `rehearsal ${CLIENT_NAMES[client] ?? client}: ${before[0]} users, migrated start ${seconds(migrateMs)}, rollback start ${seconds(rollbackMs)}`
    );
  });
});
