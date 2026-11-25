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
import {
  createAdminClient,
  createContentAPIClient,
  setupApp,
  SUPER_ADMIN,
  type TestApp,
} from '../helpers';

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

| Helper                                                                     | What                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `setupApp({ name, scaffold, seed, env })`                                  | Generate, reset the database, scaffold, seed, boot. Returns `{ app, server, seeded }`.   |
| `createAdminClient(server, { email, password })`                           | Admin API as a seeded admin user: a real login, so the user's role permissions apply.    |
| `createContentAPIClient(server, { token })`                                | Content API (`/api` prefix) with an API token, a Users & Permissions JWT, or none.       |
| `userLogin(server, { identifier, password })`                              | Users & Permissions login, returns `{ jwt, user }`.                                      |
| `createClient(server, { token, prefix })`                                  | The client the two above build on: `get`, `post`, `put`, `patch`, `delete`.              |
| `request(server, path, { method, token, body, query, formData, headers })` | One request. `query` is serialized in Strapi's bracket format (`filters[a][$eq]=b`).     |
| `createWebhookReceiver()`                                                  | Records the webhooks Strapi sends. Wait with `vi.waitFor()`; `close()` it in `afterAll`. |
| `SUPER_ADMIN`                                                              | The super admin `setupApp` seeds by default.                                             |

From `@strapi/tests-shared`, for state no route exposes (setup, cleanup, internal content types):
`queryDb(server, uid, method, params)` runs `strapi.db.query(uid)[method](params)` in the
server, `documents(server, uid, method, params)` runs `strapi.documents(uid)[method](params)`.
Check what a test is about through the API it tests. Server errors come back as `TestDataError`
with Strapi's error name.

## Coming from `tests/api`

| Old suite (`api-tests/*`)                       | Here                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `createStrapiInstance()` + `strapi.destroy()`   | `setupApp()` + `stopAllServers()`                                                                 |
| `createTestBuilder().addContentTypes().build()` | `scaffold` of `setupApp` (`scaffoldContentType`, `scaffoldComponent`)                             |
| `builder.addFixtures()`                         | `entries` of the seed plan, or `seed(server, plan)` in a test                                     |
| `createAuthRequest({ strapi, userInfo })`       | `createAdminClient(server, credentials)`, user seeded in `adminUsers`                             |
| `createContentAPIRequest()` (auth bypassed)     | `createContentAPIClient(server, { token })`: seed an API token                                    |
| `createRequest()`                               | `createClient(server)` or `request()`                                                             |
| `createUtils(strapi).createRole/createUser…`    | `adminRoles` and `adminUsers` of the seed plan, or the admin API                                  |
| `strapi.db.query()`, `strapi.documents()`       | `queryDb()`, `documents()`                                                                        |
| `strapi.eventHub.on()`                          | `createWebhookReceiver()` and a webhook created through the admin API                             |
| `describeOnCondition(edition === 'EE')`         | `describeEE()` / `describeIfFeature()` from `@strapi/tests-shared/vitest`                         |
| `rq.asHTTPS()`                                  | `headers: { 'x-forwarded-proto': 'https' }`, with Koa's proxy trust on in the app's server config |

What has no equivalent yet: hooks into Strapi's own `register` or `bootstrap` (the old
`createStrapiInstance({ register, bootstrap })`), for example faking license feature options.
