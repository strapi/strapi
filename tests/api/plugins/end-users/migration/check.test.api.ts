/**
 * Check mode: end-users dormant next to a running users-permissions, with only the admin routes
 * that report on the project and plan its files.
 */
import { createAuthRequest, createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import {
  checkInstance,
  inspectDatabase,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';
import { TEST_PASSWORD } from '../utils/permissions';

const MIGRATION = '/end-users/migration';
const REPORT_KEY = 'plugin_end-users_migration-report';

const rowsOf = (client: string, raw: any): Array<Record<string, any>> => {
  if (client.includes('pg')) {
    return raw.rows;
  }

  return client.includes('mysql') ? raw[0] : raw;
};

/** Every table with its row count: the database's whole state, for before and after */
const databaseState = () =>
  inspectDatabase(async (db) => {
    const client = String(db.client.config.client);
    const raw = client.includes('pg')
      ? await db.raw('select tablename as name from pg_tables where schemaname = current_schema()')
      : client.includes('mysql')
        ? await db.raw(
            'select table_name as name from information_schema.tables where table_schema = database()'
          )
        : await db.raw("select name from sqlite_master where type = 'table'");
    const names = rowsOf(client, raw)
      .map((row) => String(row.name))
      .sort((a, b) => a.localeCompare(b));
    const counts: Record<string, number> = {};

    for (const name of names.filter((table) => table.startsWith('up_'))) {
      // eslint-disable-next-line no-await-in-loop
      counts[name] = Number((await db(name).count({ c: '*' }).first())?.c);
    }

    return { names, counts };
  });

describe('migration from users-permissions: check mode', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;
  let rqAdmin: Awaited<ReturnType<typeof createAuthRequest>>;

  beforeAll(async () => {
    project = await seedUsersPermissionsProject();
    strapi = await checkInstance();
    rqAdmin = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    removeProjectTypes();
  });

  it('starts next to users-permissions without an end-users table or Content API route', async () => {
    const { names } = await databaseState();

    expect(names.filter((name) => name.startsWith('eu_'))).toEqual([]);

    const rq = createRequest({ strapi });
    const login = await rq.post('/api/auth/local', {
      body: { identifier: 'Alice', password: TEST_PASSWORD },
    });

    expect(login.status).toBe(200);
    expect((await rq.get('/api/end-users/permissions/me')).status).toBe(404);
    expect(
      Object.keys(strapi.contentTypes).filter((uid) => uid.startsWith('plugin::end-users'))
    ).toEqual([]);
  });

  it('reports the seeded project without changing the database', async () => {
    const before = await databaseState();
    const res = await rqAdmin.post(`${MIGRATION}/check`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      mode: 'check',
      report: { source: 'check', counts: { users: 8, providerUsers: { github: 1 } } },
    });

    const after = await databaseState();

    expect(after).toEqual(before);
  });

  it('lists the duplicate address, the providers, the untranslated template and the api token', async () => {
    const res = await rqAdmin.get(MIGRATION);
    const kinds = new Set<string>(
      res.body.data.report.items.map((item: { kind: string }) => item.kind)
    );

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('check');
    expect(res.body.data.legacyJwtHits).toBeNull();

    for (const kind of [
      'duplicate-email',
      'provider-needs-input',
      'template-untranslated',
      'api-token',
    ]) {
      expect(kinds).toContain(kind);
    }
  });

  it('stores a report with no seeded address, username or provider secret', async () => {
    const row = await strapi.db
      .connection('strapi_core_store_settings')
      .where({ key: REPORT_KEY })
      .first();
    const stored = String(row.value);
    const secrets = [project.githubSecret, project.jwtSecret, project.confirmationToken];
    const addresses = Object.values(project.users).map((user) => user.email);

    expect(JSON.parse(stored).source).toBe('check');

    for (const text of [...secrets, ...addresses, 'alice.second', 'frank@home']) {
      expect(stored).not.toContain(text);
    }
  });

  it('lists the files the switch needs and refuses to write them outside development', async () => {
    const res = await rqAdmin.get(`${MIGRATION}/files`);

    expect(res.status).toBe(200);

    const { data } = res.body;
    const paths = data.changes.map((change: { path: string }) => change.path);

    expect(paths).toContain('src/extensions/end-users/content-types/profile/schema.json');
    expect(paths).toContain('src/api/memo/content-types/memo/schema.json');
    expect(data.configBlock).toContain('fromUsersPermissions: true');
    expect(data).not.toHaveProperty('configChange');
    expect(data.writable).toBe(false);
    expect(data.reason).toBe('not-development');

    const sent = JSON.stringify(data);

    for (const secret of [project.githubSecret, project.jwtSecret]) {
      expect(sent).not.toContain(secret);
    }

    expect((await rqAdmin.post(`${MIGRATION}/files`)).status).toBe(403);
  });
});
