/**
 * The harness every migration API file builds on: a project the Users & Permissions plugin itself
 * serves, and the app put back as it was after the end-users plugin has been booted on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequest } from 'api-tests/request';

import {
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
  usersPermissionsInstance,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';
import { TEST_PASSWORD, bearer } from '../utils/permissions';
import { resetDatabase } from '../utils/reset-database';

const appFile = (...segments: string[]) =>
  path.join(path.dirname(process.env.ENV_PATH as string), ...segments);

describe('users-permissions project seed', () => {
  let project: UsersPermissionsProject;

  beforeAll(async () => {
    project = await seedUsersPermissionsProject();
  });

  afterAll(async () => {
    removeProjectTypes();
    await resetDatabase();
  });

  it('seeds a project the users-permissions plugin itself serves', async () => {
    const strapi = await usersPermissionsInstance();

    try {
      const rq = createRequest({ strapi });
      const login = await rq.post('/api/auth/local', {
        body: { identifier: 'Alice', password: TEST_PASSWORD },
      });

      expect(login.status).toBe(200);

      const me = await rq.get('/api/users/me?populate=*', { headers: bearer(login.body.jwt) });

      expect(me.status).toBe(200);
      expect(me.body).toMatchObject({ id: project.users.alice.id, company: 'Acme' });
    } finally {
      await strapi.destroy();
    }
  });

  it('puts the test app back as it was', async () => {
    // The seeded tables hold keys to up_users, which the start's drop of them does not cascade
    // over on Postgres: it starts on an empty database, as a fresh test app does
    await resetDatabase();

    const strapi = await migratedInstance(project, { migration: { fromUsersPermissions: false } });

    await strapi.destroy();

    expect(fs.existsSync(appFile('src/extensions/users-permissions'))).toBe(false);
    expect(fs.existsSync(appFile('src/extensions/end-users'))).toBe(false);

    const memo = JSON.parse(
      fs.readFileSync(appFile('src/api/memo/content-types/memo/schema.json'), 'utf8')
    );

    expect(memo.attributes.author.target).toBe('plugin::users-permissions.user');
  });
});
