import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  databaseFromEnv,
  generateApp,
  resetDatabase,
  restoreDatabase,
  scaffoldContentType,
  seedApp,
  snapshotDatabase,
  startServer,
  stopAllServers,
  type Server,
} from '@strapi/tests-shared';

import { adminLogin, port, request, worker } from '../helpers';

/**
 * The scenario of the data lifecycle spike (CMS-1943, `settings` domain), on the scaffolders and
 * seeders: a content type written before boot, one admin per default role and two entries seeded
 * before boot, one boot, the role logins, then a snapshot. A test changes state Strapi may hold in
 * memory (roles and permissions, the default locale, users, entries); a restore must undo all of
 * it and keep every session valid.
 */

const database = databaseFromEnv();

const PASSWORD = 'Testing123!';
const ARTICLE = 'api::article.article';
const ROLES = {
  admin: { email: 'admin@test.io', role: 'strapi-super-admin' },
  editor: { email: 'editor@test.io', role: 'strapi-editor' },
  author: { email: 'author@test.io', role: 'strapi-author' },
};

let server: Server;
const tokens: Record<keyof typeof ROLES, string> = { admin: '', editor: '', author: '' };

const roleByCode = async (code: string) => {
  const res = await request(server, '/admin/roles', { token: tokens.admin });
  return res.body.data.find((role: { code: string }) => role.code === code);
};

const editorCanListArticles = async () =>
  (
    await request(server, `/content-manager/collection-types/${ARTICLE}`, {
      token: tokens.editor,
    })
  ).status === 200;

const expectSeededState = async () => {
  const roles = await request(server, '/admin/roles', { token: tokens.admin });
  expect(roles.body.data.map((role: { code: string }) => role.code).sort()).toEqual([
    'strapi-author',
    'strapi-editor',
    'strapi-super-admin',
  ]);

  expect(await editorCanListArticles()).toBe(true);

  const locales = await request(server, '/i18n/locales', { token: tokens.admin });
  expect(locales.body.find((locale: { isDefault: boolean }) => locale.isDefault).code).toBe('en');

  const users = await request(server, '/admin/users', { token: tokens.admin });
  expect(users.body.data.pagination.total).toBe(3);

  const articles = await request(server, `/content-manager/collection-types/${ARTICLE}`, {
    token: tokens.admin,
  });
  expect(articles.body.pagination.total).toBe(2);

  // Every role's session survived.
  for (const token of Object.values(tokens)) {
    expect((await request(server, '/admin/users/me', { token })).status).toBe(200);
  }
};

const expectCreated = (res: { status: number; body: unknown }) => {
  expect([200, 201], JSON.stringify(res.body)).toContain(res.status);
};

const changeEverything = async () => {
  const author = await roleByCode('strapi-author');
  const editor = await roleByCode('strapi-editor');

  expect(
    (
      await request(server, '/admin/roles', {
        method: 'POST',
        token: tokens.admin,
        body: { name: 'Spike role', description: 'Created by a test' },
      })
    ).status
  ).toBe(201);

  await request(server, `/admin/roles/${editor.id}/permissions`, {
    method: 'PUT',
    token: tokens.admin,
    body: { permissions: [] },
  });
  expect(await editorCanListArticles()).toBe(false);

  expectCreated(
    await request(server, '/i18n/locales', {
      method: 'POST',
      token: tokens.admin,
      body: { code: 'de', name: 'German (de)', isDefault: true },
    })
  );

  expectCreated(
    await request(server, '/admin/users', {
      method: 'POST',
      token: tokens.admin,
      body: { email: 'new@test.io', firstname: 'New', lastname: 'User', roles: [author.id] },
    })
  );

  expectCreated(
    await request(server, `/content-manager/collection-types/${ARTICLE}`, {
      method: 'POST',
      token: tokens.admin,
      body: { title: 'Written by a test' },
    })
  );
};

beforeAll(async () => {
  const app = await generateApp({ name: `api-spike-${worker}` });
  await resetDatabase(app, database);

  scaffoldContentType(app, { singularName: 'article', attributes: { title: { type: 'string' } } });

  await seedApp(
    app,
    {
      adminUsers: Object.entries(ROLES).map(([name, { email, role }]) => ({
        email,
        password: PASSWORD,
        firstname: name,
        lastname: 'User',
        roles: [role],
      })),
      entries: ['Why I prefer football over soccer', 'Spike article'].map((title) => ({
        uid: ARTICLE,
        data: { title },
      })),
    },
    { database }
  );

  server = await startServer(app, { port, database });

  for (const [name, { email }] of Object.entries(ROLES)) {
    tokens[name as keyof typeof ROLES] = await adminLogin(server, email, PASSWORD);
  }
  // After the logins: their sessions are rows of the snapshot.
  if (database.client === 'sqlite') {
    await snapshotDatabase(server);
  }
});

afterAll(async () => {
  await stopAllServers();
});

test('the seeded state', async () => {
  await expectSeededState();
});

describe.skipIf(database.client !== 'sqlite')('restore', () => {
  test.each(['sql', 'reload'] as const)(
    '%s restore undoes every change and keeps the sessions',
    async (mode) => {
      await changeEverything();

      await restoreDatabase(server, { mode });

      await expectSeededState();
    }
  );
});
