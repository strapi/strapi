# Test suite examples

Copy the shape, then change the names, schema, seed plan and assertions. Paths are relative to
`tests-next/`.

## api (and cli)

Put the file in `api/tests/<domain>/<name>.api-test.ts`, so `../helpers` resolves.

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

The cli suite has no `helpers.ts`. Replace the `../helpers` import with the lines below, name the
app `cli-<domain>-${worker}`, and call the server with `fetch`, which needs no helper:

```ts
import { appPort } from '@strapi/tests-shared';

// Each Vitest worker gets its own app, port and database (VITEST_POOL_ID starts at 1).
const worker = Number(process.env.VITEST_POOL_ID ?? 1);
const port = appPort('cli', worker - 1);

// In the test:
const res = await fetch(`${server.url}/api/articles`, {
  headers: { authorization: `Bearer ${token}` },
});
```

No helper runs a CLI command yet. Start it with `node:child_process` in `app.dir`, with
`env: appEnv(app, { … })` (`@strapi/tests-shared`), never `process.env`: the shell's `DATABASE_*`
and edition would reach the command.

## ui

Put the file in `ui/tests/<domain>/<name>.ui-test.ts`.

```ts
import { expect, test } from '../../fixtures';

// 'file' (default): restore the snapshot before each spec file. 'test': before each test.
test.use({ resetScope: 'file' });

// The page starts logged in as the Super Admin: `test.use({ role: 'editor' })` for another role.
test('serves the admin panel', async ({ page }) => {
  await page.goto('/admin'); // baseURL is the worker's server
  await expect(page).toHaveTitle(/Strapi/);
});

test.describe('releases', { tag: '@ee' }, () => {
  test.use({ requires: { ee: ['cms-content-releases'] } });

  test('runs only on an EE instance with the feature', async ({ features }) => {
    expect(features.ee).toContain('cms-content-releases');
  });
});
```
