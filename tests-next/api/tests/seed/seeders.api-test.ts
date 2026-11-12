import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  databaseFromEnv,
  generateApp,
  resetDatabase,
  scaffoldConfig,
  scaffoldContentType,
  seed,
  seedApp,
  startServer,
  stopAllServers,
  type App,
  type SeedResult,
  type Server,
} from '@strapi/tests-shared';

import { adminLogin, port, request, worker } from '../helpers';

const database = databaseFromEnv();

const PASSWORD = 'Testing123!';
const ARTICLE = 'api::article.article';
// With i18n, a Content Manager permission without `locales` grants no locale at all.
const READ_ARTICLES = {
  action: 'plugin::content-manager.explorer.read',
  subject: ARTICLE,
  properties: { fields: ['title'], locales: ['en', 'fr'] },
};
// A 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

let app: App;
let server: Server;
let seeded: SeedResult;
let fullAccess: string;

beforeAll(async () => {
  app = await generateApp({ name: `api-seed-${worker}` });
  await resetDatabase(app, database);

  scaffoldContentType(app, {
    singularName: 'article',
    draftAndPublish: true,
    pluginOptions: { i18n: { localized: true } },
    attributes: {
      title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    },
  });
  scaffoldConfig(app, 'features', { future: { adminTokens: true } });

  const image = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'seed-media-')), 'pixel.png');
  fs.writeFileSync(image, PNG);

  // Before boot, in one Strapi load.
  seeded = await seedApp(
    app,
    {
      locales: [{ code: 'fr', name: 'French (fr)' }],
      adminRoles: [
        { name: 'Article reader', code: 'article-reader', permissions: [READ_ARTICLES] },
      ],
      adminUsers: [
        {
          email: 'admin@test.io',
          password: PASSWORD,
          firstname: 'Super',
          lastname: 'Admin',
          roles: ['strapi-super-admin'],
        },
        {
          email: 'reader@test.io',
          password: PASSWORD,
          firstname: 'Article',
          lastname: 'Reader',
          roles: ['article-reader'],
        },
      ],
      users: [{ username: 'jane', email: 'jane@test.io', password: PASSWORD }],
      media: [{ file: image, alternativeText: 'A pixel' }],
      entries: [
        { uid: ARTICLE, data: { title: 'Hello' }, status: 'published' },
        { uid: ARTICLE, data: { title: 'Bonjour' }, locale: 'fr', status: 'published' },
      ],
      apiTokens: [
        { name: 'full', type: 'full-access' },
        { kind: 'admin', name: 'reader', owner: 'admin@test.io', permissions: [READ_ARTICLES] },
      ],
    },
    { database }
  );
  fullAccess = seeded.apiTokens[0].accessKey;

  server = await startServer(app, { port, database });
});

afterAll(async () => {
  await stopAllServers();
});

describe('seedApp, before boot', () => {
  test('returns what it created', () => {
    expect(seeded.locales).toEqual([expect.objectContaining({ code: 'fr' })]);
    expect(seeded.adminRoles).toEqual([expect.objectContaining({ code: 'article-reader' })]);
    expect(seeded.adminUsers.map((user) => user.email)).toEqual([
      'admin@test.io',
      'reader@test.io',
    ]);
    expect(seeded.entries).toHaveLength(2);
    expect(seeded.entries[0].documentId).toEqual(expect.any(String));
    expect(seeded.apiTokens.map((token) => token.accessKey)).toEqual([
      expect.any(String),
      expect.any(String),
    ]);
  });

  test('locales', async () => {
    const res = await request(server, '/api/i18n/locales', { token: fullAccess });
    expect(res.body.map((locale: { code: string }) => locale.code).sort()).toEqual(['en', 'fr']);
  });

  test('admin roles with their permissions, and admin users', async () => {
    const reader = await adminLogin(server, 'reader@test.io', PASSWORD);

    const articles = await request(server, `/content-manager/collection-types/${ARTICLE}`, {
      token: reader,
    });
    expect(articles.status).toBe(200);
    expect(articles.body.results).toEqual([expect.objectContaining({ title: 'Hello' })]);

    const users = await request(server, '/admin/users', { token: reader });
    expect(users.status).toBe(403);
  });

  test('end users', async () => {
    const res = await request(server, '/api/auth/local', {
      method: 'POST',
      body: { identifier: 'jane@test.io', password: PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
  });

  test('media', async () => {
    const res = await request(server, '/api/upload/files', { token: fullAccess });
    expect(res.body).toEqual([
      expect.objectContaining({ name: 'pixel.png', alternativeText: 'A pixel', mime: 'image/png' }),
    ]);

    const file = await fetch(`${server.url}${res.body[0].url}`);
    expect(file.status).toBe(200);
  });

  test('entries, per locale and status', async () => {
    const en = await request(server, '/api/articles', { token: fullAccess });
    expect(en.body.data).toEqual([expect.objectContaining({ title: 'Hello', locale: 'en' })]);

    const fr = await request(server, '/api/articles?locale=fr', { token: fullAccess });
    expect(fr.body.data).toEqual([expect.objectContaining({ title: 'Bonjour', locale: 'fr' })]);
  });

  test('admin tokens, within their permissions', async () => {
    const token = seeded.apiTokens[1].accessKey;

    const articles = await request(server, `/content-manager/collection-types/${ARTICLE}`, {
      token,
    });
    expect(articles.status).toBe(200);

    const users = await request(server, '/admin/users', { token });
    expect(users.status).toBe(403);
  });
});

describe('seed, in the running server', () => {
  test('adds data without a restart', async () => {
    const { bootId } = (await request(server, '/api/tests/boot')).body;

    const { entries } = await seed(server, {
      entries: [{ uid: ARTICLE, data: { title: 'Live' }, status: 'published' }],
    });

    const res = await request(server, `/api/articles/${entries[0].documentId}`, {
      token: fullAccess,
    });
    expect(res.body.data).toMatchObject({ title: 'Live' });
    expect((await request(server, '/api/tests/boot')).body.bootId).toBe(bootId);
  });

  test('a mistake in the plan fails with its cause', async () => {
    await expect(seed(server, { nope: [] } as never)).rejects.toThrow('Unknown seed steps: nope');
    await expect(
      seed(server, {
        adminUsers: [
          {
            email: 'x@test.io',
            password: PASSWORD,
            firstname: 'X',
            lastname: 'X',
            roles: ['nope'],
          },
        ],
      })
    ).rejects.toThrow('Unknown admin role "nope"');
    await expect(seed(server, { entries: [{ uid: 'api::nope.nope', data: {} }] })).rejects.toThrow(
      'Unknown content type "api::nope.nope"'
    );
  });
});
