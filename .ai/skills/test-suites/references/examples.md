# Test suite examples

Minimal tests, checked on develop in a CE run. Copy the shape, then change the names, schema,
seed plan and assertions. Paths are relative to `tests-next/`. Back to the procedure: [SKILL.md](../SKILL.md).

## api (and cli)

One app and one server per file, on an empty database. Ports and app names come from the Vitest
worker (`api/tests/helpers.ts`), so files can run in parallel. Put the file in
`api/tests/<domain>/<name>.api-test.ts`, so `../helpers` resolves.

```ts
import { afterAll, beforeAll, expect, test } from 'vitest';

import {
  databaseFromEnv,
  generateApp,
  resetDatabase,
  scaffoldContentType,
  seedApp,
  startServer,
  stopAllServers,
  type Server,
} from '@strapi/tests-shared';

import { port, request, worker } from '../helpers';

const database = databaseFromEnv();
let server: Server;
let token: string;

beforeAll(async () => {
  const app = await generateApp({ name: `api-articles-${worker}` });
  await resetDatabase(app, database);

  scaffoldContentType(app, {
    singularName: 'article',
    draftAndPublish: true,
    attributes: { title: { type: 'string' } },
  });

  const { apiTokens } = await seedApp(
    app,
    {
      entries: [{ uid: 'api::article.article', data: { title: 'Hello' }, status: 'published' }],
      apiTokens: [{ name: 'read', type: 'read-only' }],
    },
    { database }
  );
  token = apiTokens[0].accessKey;

  server = await startServer(app, { port, database });
});

afterAll(async () => {
  await stopAllServers();
});

test('lists the published articles', async () => {
  const res = await request(server, '/api/articles', { token });

  expect(res.status).toBe(200);
  expect(res.body.data.map((article: { title: string }) => article.title)).toEqual(['Hello']);
});
```

The cli suite uses the same shape with `appPort('cli', worker - 1)`.

## ui

The ui suite runs one app per run, generated and built by `ui/setup/global-setup.ts`. Import
`test` and `expect` from `ui/fixtures/app.ts`, never from `@playwright/test`. The `server`
fixture is started and snapshotted once per worker. Content types can't be scaffolded per spec
yet: seed what the spec needs with `seed(server, plan)`.

```ts
import { seed } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// 'file' (default): restore the snapshot before each spec file. 'test': before each test.
test.use({ resetScope: 'file' });

test.beforeAll(async ({ server }) => {
  await seed(server, {
    adminUsers: [
      {
        email: 'editor@test.io',
        password: 'Testing123!',
        firstname: 'Editor',
        lastname: 'User',
        roles: ['strapi-editor'],
      },
    ],
  });
});

test('serves the admin panel', async ({ page, server }) => {
  await page.goto(`${server.url}/admin`);
  await expect(page).toHaveTitle(/Strapi/);
});

test.describe('releases', { tag: '@ee' }, () => {
  test.use({ requires: { ee: ['cms-content-releases'] } });

  test('runs only on an EE instance with the feature', async ({ features }) => {
    expect(features.ee).toContain('cms-content-releases');
  });
});
```
