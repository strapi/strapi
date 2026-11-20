# Test suites (`tests-next/`)

The new test suites of the Test Infrastructure Overhaul. They replace `/tests` domain by domain,
and the folder is renamed `/tests` at the cutover. Read this before you write or migrate a test.
[`README.md`](README.md) has the details.

## Where a test goes

A domain (`settings`, `i18n`, `content-releases`…) lives in exactly one suite tree:

- **Migrated domain**: write the test in `tests-next/`.
- **Not migrated yet**: write it in `/tests`, with the old patterns.
- **Migration PR open for the domain**: coordinate with it. Do not add tests to either side
  without telling its author.

A domain is migrated when `tests-next/<suite>/tests/<domain>/` exists and its old folder is gone
(`tests/e2e/tests/<domain>`, `tests/api/core/<domain>`, `tests/api/plugins/<domain>`,
`tests/cli/tests/<domain>`). Each migration PR deletes the old folder. The folders `app/`, `db/`,
`edition/`, `scaffold/`, `seed/`, `test-plugin/` and `scenarios/` test the suites themselves:
they are not domains.

## Suites

| Workspace | Package                | Runner     | File suffix    | Command                              | What goes there                                          |
| --------- | ---------------------- | ---------- | -------------- | ------------------------------------ | -------------------------------------------------------- |
| `shared/` | `@strapi/tests-shared` | none       |                | `lint` and `test:ts` only            | Helpers and the test plugin. No tests.                   |
| `api/`    | `@strapi/tests-api`    | Vitest     | `.api-test.ts` | `yarn nx run @strapi/tests-api:test` | HTTP tests against a running server (Content API, admin) |
| `ui/`     | `@strapi/tests-e2e`    | Playwright | `.ui-test.ts`  | `yarn nx run @strapi/tests-e2e:test` | Admin panel tests in a browser                           |
| `cli/`    | `@strapi/tests-cli`    | Vitest     | `.cli-test.ts` | `yarn nx run @strapi/tests-cli:test` | `strapi` and `create-strapi-app` commands                |

Every package also has `lint` and `test:ts` targets. Run `yarn build` first, and again after a
change under `packages/`: the test apps run the workspace packages from their `dist`.

## Test lifecycle

Everything comes from `@strapi/tests-shared` (Vitest helpers from `@strapi/tests-shared/vitest`).
Write the schema and config before boot, seed, then boot once. No step restarts Strapi.

1. `generateApp({ name })`: an empty app in `test-apps/next/<name>`.
2. `resetDatabase(app, database)`: an empty database for that app.
3. Scaffolders write files that Strapi syncs on boot: `scaffoldContentType`,
   `scaffoldComponent`, `scaffoldConfig` (for example `features` future flags), `scaffoldPlugin`.
4. `seedApp(app, plan, { database })` seeds before boot. `seed(server, plan)` seeds a running
   server. A plan (`SeedPlan`) holds locales, admin roles and users, end users, media, entries
   and API tokens.
5. `startServer(app, { port, database })` boots `strapi develop` and waits for `/_health`.
   `appEnv` builds the env it runs with; pass extra variables with the `env` option.
6. `snapshotDatabase(server)` and `restoreDatabase(server)`: SQLite only. The ui fixtures call
   them for you.
7. `stopAllServers()` in `afterAll`. It also stops a server whose start outlived a timeout.

### api (and cli) example

One app and one server per file, on an empty database. Ports and app names come from the Vitest
worker (`api/tests/helpers.ts`), so files can run in parallel.

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

### ui example

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

## Rules

- **Set up data with the scaffolders and seeders.** Never use the old `.tar` / export datasets
  (`resetDatabaseAndImportDataFromPath`), the transfer token, or the `packages/utils/api-tests`
  builder (`createTestBuilder`). They boot Strapi per step or depend on data you can't read.
- **Talk to the server over HTTP.** No `global.strapi` and no in-process Strapi
  (`createStrapiInstance`) in a test: the server is a separate process, like in production.
- **Never raise a timeout to fix a failure.** Read the error, the server logs
  (`server.logs()`) or the Playwright trace, and fix the cause.
- **EE tests declare what they need.** Vitest: `describeEE`, `describeIfFeature` (start the
  server in an outer `beforeAll`), `requireServerFeature`. Playwright: tag the test `@ee` and
  set `test.use({ requires: { ee: [...], future: [...] } })`. In an EE run, a missing feature
  fails the test instead of skipping it. In a CE run, EE blocks and `@ee` tests are skipped by
  design. The edition comes from `STRAPI_TEST_EDITION`, never from code.
- **A test passes on its own** (`--grep`, a single file, a shard). Put the data several tests
  share in `beforeAll`, not in an earlier test. With `resetScope: 'test'`, the restore before
  each test wipes what `beforeAll` wrote: seed in the test instead.
- **The test plugin routes (`/api/tests/*`) are test helpers that answer loopback requests
  only.** When a test needs a hook into Strapi, add a route to `shared/test-plugin`, not a
  public endpoint or an `auth: false` route in the app.
- **Lint runs with `--max-warnings=0`.** Every warning fails, including an `eslint-disable`
  directive that disables nothing.

## Commands

```bash
yarn build                                                       # once, and after changing packages/
yarn nx run @strapi/tests-api:test                               # whole suite
yarn nx run @strapi/tests-api:test -- tests/seed                 # files whose path matches
yarn workspace @strapi/tests-api test -t "lists the published"   # Vitest tests by title
yarn workspace @strapi/tests-e2e test --grep "serves the admin"  # Playwright tests by title
yarn nx run @strapi/tests-api:lint
yarn nx run @strapi/tests-api:test:ts
```

Nx splits a quoted argument at its spaces: filter by title with `yarn workspace`, which passes
it whole.

| Variable                                             | Default   | Effect                                                                    |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| `TESTS_DATABASE`                                     | `sqlite`  | `postgres` or `mysql` for the api and cli suites. The ui suite is SQLite. |
| `TESTS_DATABASE_HOST`, `_PORT`, `_USER`, `_PASSWORD` | CI values | Connection to the database server.                                        |
| `STRAPI_TEST_EDITION`                                | `ce`      | `ee` needs `STRAPI_LICENSE`; the run fails if Strapi boots as CE.         |
| `STRAPI_LICENSE`                                     |           | License of EE runs. CE runs remove it from the app env.                   |
| `TESTS_PORT_BASE`                                    | `8600`    | First port. ui uses `+0`, api `+20`, cli `+40`.                           |

Two checkouts (worktrees) that run suites at the same time collide on the default ports, and
`startServer` fails with `Port … is already in use`. Give each one its own range, for example
`TESTS_PORT_BASE=9800`.

## More

- [`README.md`](README.md): generated apps, ports, databases, resets, edition.
- Seed plan fields: `shared/src/seed/types.ts`. Test plugin routes: `shared/test-plugin/strapi-server.js`.
- Examples: `api/tests/scenarios/settings-spike.api-test.ts`, `api/tests/edition/`,
  `ui/tests/db/`, `ui/tests/edition/`.
