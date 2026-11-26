# @strapi/tests-api

The API test suite of the Test Infrastructure Overhaul: Vitest, `tests/**/*.api-test.ts`. How to
run it, databases, ports and resets: [tests-next/README.md](../README.md).

```bash
yarn build                                   # once, and after changing packages/
yarn workspace @strapi/tests-api test        # SQLite
TESTS_DATABASE=postgres yarn workspace @strapi/tests-api test
yarn workspace @strapi/tests-api test tests/requests   # one folder or file
```

## A test file

One Strapi instance per file, in its own process, on an empty database. The file writes its
schema and seeds before the boot; nothing restarts Strapi.

```ts
import { afterAll, beforeAll, expect, test } from 'vitest';
import { scaffoldContentType, stopAllServers } from '@strapi/tests-shared';
import { createContentAPIClient, setupApp, SUPER_ADMIN, type TestApp } from '../helpers';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await setupApp({
    name: 'articles', // app api-articles-<worker>
    scaffold(app) {
      scaffoldContentType(app, {
        singularName: 'article',
        attributes: { title: { type: 'string' } },
      });
    },
    seed: {
      adminUsers: [SUPER_ADMIN],
      entries: [{ uid: 'api::article.article', data: { title: 'Hello' } }],
      apiTokens: [{ name: 'read', type: 'read-only' }],
    },
  });
});

afterAll(stopAllServers);

test('reads articles', async () => {
  const api = createContentAPIClient(ctx.server, { token: ctx.seeded.apiTokens[0].accessKey });
  expect((await api.get('/articles')).body.data).toHaveLength(1);
});
```

## Helpers (`tests/helpers.ts`)

| Helper                                                                           | What                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `await setupApp({ name, scaffold, seed, env, database })`                        | Generate, reset the database, scaffold, seed, boot. Returns `{ app, server, database, seeded }`. `database` defaults to the run's (`TESTS_DATABASE`).                   |
| `await createAdminClient(server, { email, password })`                           | Admin API as a seeded admin user: a real login, so the user's role permissions apply. Also returns `user`.                                                              |
| `createContentAPIClient(server, { token })`                                      | Content API (`/api` prefix) with an API token, a Users & Permissions JWT, or none.                                                                                      |
| `await userLogin(server, { identifier, password })`                              | Users & Permissions login, returns `{ jwt, user }`.                                                                                                                     |
| `createClient(server, { token, prefix })`                                        | The client the two above build on: `get`, `post`, `put`, `patch`, `delete`.                                                                                             |
| `await request(server, path, { method, token, body, query, formData, headers })` | One request. `query` is serialized in Strapi's bracket format (`filters[a][$eq]=b`). `headers` replace the defaults whatever their case (`Authorization` over `token`). |
| `await createWebhookReceiver()`                                                  | Records the webhooks Strapi sends. Wait with `vi.waitFor()`; `close()` it in `afterAll`.                                                                                |
| `SUPER_ADMIN`                                                                    | Seeded by `setupApp` only when `seed` is omitted: a seed plan replaces the default, so list it in its `adminUsers`.                                                     |

From `@strapi/tests-shared`, for state no route exposes (setup, cleanup, internal content types):
`await queryDb(server, uid, method, params)` runs `strapi.db.query(uid)[method](params)` in the
server (`findOne`, `findMany`, `count`, `create`, `createMany`, `update`, `updateMany`, `delete`,
`deleteMany`), `await documents(server, uid, method, params)` runs
`strapi.documents(uid)[method](params)` (`findOne`, `findFirst`, `findMany`, `count`, `create`,
`update`, `delete`, `publish`, `unpublish`, `discardDraft`). Other methods are rejected: add them
to `shared/test-plugin/lib/data.js` when a test needs one. `uid` is a content type or a component,
not a join table: read relation state through `populate`.
Check what a test is about through the API it tests. Server errors come back as `TestDataError`
with Strapi's error name.

### Server scripts

What no route reaches and `queryDb` / `documents` don't cover (transactions, the knex
connection, the schema inspector, query scopes, lifecycles, document service middlewares, log
calls) runs in the server, in a **server script**: a CommonJS file next to the test, in a
`server/` folder, copied into the app before boot.

```js
// tests/core/database/server/transactions.js
module.exports = {
  bootstrap({ strapi }) {}, // optional: runs in the test plugin's bootstrap (lifecycle subscribers)
  actions: {
    async getKey({ strapi }) {
      const [row] = await strapi.db
        .queryBuilder('strapi::core-store')
        .select(['key'])
        .where({ id: 1 })
        .execute();
      return row.key;
    },
  },
};
```

```ts
scaffold(app) {
  scaffoldServerScript(app, path.join(__dirname, 'server/transactions.js')); // name: 'transactions'
},
// ...
expect(await runInServer(ctx.server, 'transactions', 'getKey')).toBe('…');
```

- An action gets `({ strapi, serializeError }, args)` and returns JSON. The module stays loaded
  for the life of the server, so module variables keep state between actions (a registered scope,
  captured log calls).
- An error it throws comes back as a `ServerScriptError` with the same `name`, `message` and
  `details` (and `serverStack`): `rejects.toMatchObject({ name: 'SavepointError' })` works.
- A `register({ strapi })` hook runs in the test plugin's register, **after** Strapi has created
  its database: set database config (`acquireConnectionTimeout`…) with
  `scaffoldConfig(app, 'database', …)` instead.
- The copy can't require files next to the original: require packages only, listed in this
  workspace's `devDependencies` (they resolve from the repo root).
- Keep the assertions in the test. An action does what the old test did with `strapi` and
  returns what it saw, including the outcome of a call expected to throw.

### Scaffolders added for the API suite

- `scaffoldDependency(app, '@strapi/plugin-graphql')`: adds a repo package to the app's
  `package.json`, so Strapi loads the plugin. The test apps only have Users & Permissions.
- `scaffoldContentType` refuses a content type routed at `/api/tests` (`pluralName: 'tests'`):
  its `GET /api/tests/:id` would answer instead of the test plugin, and the server fails its
  edition check with a 403.

## Coming from `tests/api`

| Old suite (`api-tests/*`)                       | Here                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createStrapiInstance()` + `strapi.destroy()`   | `setupApp()` + `stopAllServers()`                                                                                                                                                     |
| `createTestBuilder().addContentTypes().build()` | `scaffold` of `setupApp` (`scaffoldContentType`, `scaffoldComponent`)                                                                                                                 |
| `builder.addFixtures()`                         | `entries` of the seed plan, or `seed(server, plan)` in a test                                                                                                                         |
| `createAuthRequest({ strapi, userInfo })`       | `createAdminClient(server, credentials)`, user seeded in `adminUsers`                                                                                                                 |
| `createContentAPIRequest()` (auth bypassed)     | `createContentAPIClient(server, { token })`: seed an API token                                                                                                                        |
| `createRequest()`                               | `createClient(server)` or `request()`                                                                                                                                                 |
| `createUtils(strapi).createRole/createUser…`    | `adminRoles` and `adminUsers` of the seed plan, or the admin API                                                                                                                      |
| `strapi.db.query()`, `strapi.documents()`       | `queryDb()`, `documents()`                                                                                                                                                            |
| any other `strapi.*` (transactions, knex, logs) | an action of a [server script](#server-scripts), `runInServer()`                                                                                                                      |
| `createStrapiInstance({ bootstrap })`           | `bootstrap` of a server script                                                                                                                                                        |
| `createStrapiInstance({ register })` on config  | `scaffoldConfig()` (database config is read before any plugin registers)                                                                                                              |
| `jest.spyOn(strapi.log, 'error')`               | a server script action that wraps `strapi.log.error` and returns the calls                                                                                                            |
| `dotenv` + `DATABASE_CLIENT` for DB conditions  | `databaseFromEnv().client` with `describe.skipIf` / `test.skipIf`                                                                                                                     |
| `strapi.eventHub.on()`, webhook events          | `createWebhookReceiver()` and a webhook created through the admin API, for the events webhooks accept (`entry.*`, `media.*`, `releases.publish`, `review-workflows.updateEntryStage`) |
| `describeOnCondition(edition === 'EE')`         | `describeEE()` / `describeIfFeature()` from `@strapi/tests-shared/vitest`                                                                                                             |
| `rq.asHTTPS()`                                  | `headers: { 'x-forwarded-proto': 'https' }`, with Koa's proxy trust on in the app's server config                                                                                     |

What has no equivalent yet:

- code that must run before Strapi creates its database or its services, for example shadowing
  `strapi.ee` to fake license feature options;
- `strapi.eventHub.on()` for the events webhooks don't accept (`POST /admin/webhooks` answers 400
  `Webhook event <name> is not supported`, see `allowedEvents` in
  `packages/core/core/src/services/webhook-store.ts`): for example `admin.auth.success`,
  `user.update`, `role.*` or `content-type.update`, which the audit-logs tests listen to.

## Migrating a domain

The legacy suite (`tests/api`) moves here domain by domain (`core/database` first, CMS-1958). A
domain lives in one suite at a time: a migration PR moves its tests and deletes the old files.

- **Same place, new suffix**: `tests/api/<path>/<name>.test.api.(js|ts)` becomes
  `tests/<path>/<name>.api-test.ts`, in TypeScript (`core/database/db.test.api.js` →
  `tests/core/database/db.api-test.ts`). Server scripts go in a `server/` folder next to it.
- **Moved, not rewritten**: a migrated test keeps its name, intent and assertions. What changes
  is how it reaches Strapi: the app from `setupApp`, the schema from scaffolders, data from the
  seed plan or `queryDb`, requests through the clients, everything else through a server
  script. A test file that reset rows between tests keeps doing it, on one app per file.
- **Public API first**: use the clients for what the test checks when a route exists. When the
  internal API is what the domain is (the database layer: `strapi.db.query`, transactions), call
  it through `queryDb` or a server script, and say so at the top of the file.
- **No auth bypass**: the old `createContentAPIRequest` skipped the content API auth. Seed a
  `full-access` API token and use it for content API and `/graphql` requests.
- **Check what the test relied on**: the old test app was not this one.
  - Its plugins (GraphQL, documentation, cloud) are not here: add them with
    `scaffoldDependency`.
  - The old content API agent ran with `STRAPI_GRAPHQL_V4_COMPATIBILITY_MODE=true`; this app
    doesn't.
  - Content types named `test` (route `/api/tests`) collide with the test plugin: rename them,
    and the tables or assertions that follow from the name.
- **Look for assertions that never ran**: an `expect` inside a `try` whose `catch` swallows
  everything (`expect('this should not be reached').toBe(false)`, or a check in the middle of a
  transaction callback) passes whatever happens. Move the observed value out (the action returns
  it) and assert it in the test: `core/database` had one such assertion that was wrong.
- **DB-specific tests keep their condition**: `describe.skipIf(databaseFromEnv().client !==
'postgres')`. They run in the CI job of that database.

Checklist for each migration PR:

1. **Inventory**: every legacy test of the migrated files, and where it went (file and test
   name), or why it was dropped. List the skipped tests and `test.todo` with what you did
   (kept, fixed, dropped).
2. **Delete the legacy files** in the same PR, and the legacy helpers only they used. Update
   the references to their paths (contributor docs, comments). The legacy runner finds its files
   by pattern, so no list needs editing; check it still runs another area
   (`yarn test:api --db=sqlite tests/api/core/email`).
3. **Runtime**: give the runtime of the migrated files next to the legacy baseline (one local
   run of `yarn test:api --db=sqlite tests/api/<domain>`).
4. **Check that each migrated test can fail**: break what it checks (a fixture row, the scope it
   tests, a step of the transaction) and see it fail on the assertion it exists for.
5. **Run it on SQLite, Postgres and MySQL** (`TESTS_DATABASE`, with
   `docker-compose -f docker-compose.dev.yml up -d`), or say which ones only CI ran.
