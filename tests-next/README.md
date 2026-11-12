# /tests-next

The new test suites of the Test Infrastructure Overhaul. They replace `/tests` domain by domain,
and the folder is renamed `/tests` at the cutover.

| Workspace | Package                | Runner                                                                  |
| --------- | ---------------------- | ----------------------------------------------------------------------- |
| `shared/` | `@strapi/tests-shared` | Foundation: app lifecycle, scaffolders, seeders, DB resets, test plugin |
| `ui/`     | `@strapi/tests-e2e`    | Playwright, `*.ui-test.ts`                                              |
| `api/`    | `@strapi/tests-api`    | Vitest, `*.api-test.ts`                                                 |
| `cli/`    | `@strapi/tests-cli`    | Vitest, `*.cli-test.ts`                                                 |

## Run

```bash
yarn install
yarn build                              # once, and again after changing anything under packages/
yarn nx run @strapi/tests-api:test
yarn nx run @strapi/tests-cli:test
yarn nx run @strapi/tests-e2e:test      # also builds the admin of its app, about 10 s
```

- **Build first.** The apps run the workspace packages from their `dist`. Without a build, app
  generation fails with `Cannot find module '…/create-strapi-app/dist/index.js'`. With a stale
  build, the suites run against the old code. CI builds before these jobs.
- **Generated apps** live in `test-apps/next/<name>` (git-ignored). They have no dependency
  installed: `@strapi/*` resolves from the root `node_modules`. Deleting the folder is safe.
- **Ports**: from `TESTS_PORT_BASE` (default 8600), with one range per suite (ui `+0`, api `+20`,
  cli `+40`), so suites can run side by side.
- **Database**: SQLite by default. `TESTS_DATABASE=postgres` or `mysql` runs the api and cli
  suites on a database server instead, with `TESTS_DATABASE_HOST`, `_PORT`, `_USER` and
  `_PASSWORD` (defaults match the CI services). Each app gets its own database, emptied before
  it boots. A `DATABASE_*` variable exported in your shell doesn't reach the test apps.
- **Resets** (RFC D4): api and cli start one instance per file on an empty database. The ui
  suite snapshots its SQLite database when the worker starts, then restores it before each spec
  file (`resetScope: 'file'`, default) or each test (`test.use({ resetScope: 'test' })`).
- **Edition** (RFC D6): `STRAPI_TEST_EDITION=ce` (default) or `ee`, read by one module
  (`shared/src/edition`) for every suite. `ee` needs `STRAPI_LICENSE`; without it, or when
  Strapi rejects the license and boots as CE, the run fails instead of testing CE. A CE run
  removes any license from the app env. See [Edition](#edition).
- **One ui worker** for now: each worker will need its own app and database first.
- **Windows** is not supported yet: stopping a server signals its process group.

## Set up an app

Write the schema and config before boot, seed, then boot once. No step restarts Strapi.

```ts
const app = await generateApp({ name: `api-articles-${worker}` });
await resetDatabase(app, database);

// Scaffolders: files in the app, synced by Strapi on boot.
scaffoldContentType(app, { singularName: 'article', attributes: { title: { type: 'string' } } });
scaffoldComponent(app, { uid: 'shared.seo', attributes: { title: { type: 'string' } } });
scaffoldConfig(app, 'features', { future: { adminTokens: true } }); // config/env/development/
scaffoldPlugin(app, 'users-permissions', { config: { jwt: { expiresIn: '1h' } } });

// Seeders, before boot: one Strapi load for the whole plan (about 2.5 s).
const { apiTokens } = await seedApp(
  app,
  {
    adminUsers: [{ email, password, firstname, lastname, roles: ['strapi-editor'] }],
    entries: [{ uid: 'api::article.article', data: { title: 'Hello' }, status: 'published' }],
    apiTokens: [{ name: 'full', type: 'full-access' }],
  },
  { database }
);

const server = await startServer(app, { port, database });

// Seeders, in the running server: data a test adds on top, without a restart.
await seed(server, { entries: [{ uid: 'api::article.article', data: { title: 'Live' } }] });
```

A seed plan (`SeedPlan`) is JSON: locales, admin roles and users, end users, media, entries and
API tokens (content API and admin). The test plugin runs it in that order, so `seedApp` and
`seed` behave the same. Examples: `api/tests/seed/` and `api/tests/scenarios/settings-spike`.

## Edition

Features and future flags are read from the running instance (`getInstanceFeatures(server)`),
never from env vars. A test that needs one the instance doesn't have **fails**, it doesn't skip.

- **ui (Playwright):** tag EE-only tests `@ee`; CE runs leave them out. EE runs replay the
  `@ee` and `@smoke` tests only. Declare requirements with
  `test.use({ requires: { ee: ['cms-content-releases'], future: ['someFlag'] } })`, and read
  the instance with the `features` fixture.
- **api and cli (Vitest):** `describeEE()` and `describeIfFeature()` from
  `@strapi/tests-shared/vitest` run only in EE runs, and `describeIfFeature()` fails when the
  feature is missing. `requireFeatures(features, { future: [...] })` checks future flags.

Set future flags with `scaffoldConfig(app, 'features', { future: { someFlag: true } })`.
