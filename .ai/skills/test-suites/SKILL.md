---
name: test-suites
description: Use when writing, fixing or reviewing a test in `tests-next/` (`*.api-test.ts`, `*.ui-test.ts`, `*.cli-test.ts`, `tests-next/shared/`), when migrating a test domain from `tests/` to `tests-next/`, or when deciding whether a new API, E2E or CLI test goes in `tests/` or `tests-next/`. Not for unit or frontend tests in `__tests__/`.
---

# Test suites (`tests-next/`)

Details (generated apps, ports, databases, resets, edition): [tests-next/README.md](../../../tests-next/README.md). Helpers: `tests-next/shared/src`.

## Procedure

### 1. Decide where the test goes

In each suite, a domain (`settings`, `i18n`, `content-releases`…) lives in exactly one tree: `tests/` or `tests-next/`.

- Migrated domain: write the test in `tests-next/`.
- Not migrated yet: write it in `tests/`, with the old patterns. This skill stops here.
- Migration PR open for the domain: look for an open PR that adds `tests-next/<suite>/tests/<domain>/` (`gh pr list --repo strapi/strapi --search "tests-next <domain>"`). If one exists, stop and tell the user.

Migration is per suite. A domain is migrated in a suite when `tests-next/<suite>/tests/<domain>/` exists and the suite's old folders are gone: ui, `tests/e2e/tests/<domain>`; api, `tests/api/core/<domain>` and `tests/api/plugins/<domain>`; cli, `tests/cli/tests/<domain>`. Old folder names can differ from the domain (`media-library` and `upload`): match by what the tests cover, and ask when unsure. Each migration PR deletes the old folders. The folders `app/`, `db/`, `edition/`, `scaffold/`, `seed/`, `test-plugin/` and `scenarios/` test the suites themselves: they are not domains.

To migrate a domain, rewrite every test of its old folders in `tests-next/` with step 3 (do not port the old helpers), and delete the old folders in the same PR. Done when each old test is rewritten, or named in the PR description with the reason it was dropped.

### 2. Pick the suite

| Workspace | Package                | Runner     | File suffix    | What goes there                                          |
| --------- | ---------------------- | ---------- | -------------- | -------------------------------------------------------- |
| `api/`    | `@strapi/tests-api`    | Vitest     | `.api-test.ts` | HTTP tests against a running server (Content API, admin) |
| `ui/`     | `@strapi/tests-e2e`    | Playwright | `.ui-test.ts`  | Admin panel tests in a browser                           |
| `cli/`    | `@strapi/tests-cli`    | Vitest     | `.cli-test.ts` | `strapi` and `create-strapi-app` commands                |
| `shared/` | `@strapi/tests-shared` | none       |                | Helpers and the test plugin. No tests.                   |

Put the file in `tests-next/<suite>/tests/<domain>/`.

### 3. Set up the app

Everything comes from `@strapi/tests-shared` (Vitest helpers from `@strapi/tests-shared/vitest`). Write the schema and config before boot, seed, then boot once. No step restarts Strapi.

1. `generateApp({ name })`: an empty app in `test-apps/next/<name>`.
2. `resetDatabase(app, database)`: an empty database for that app.
3. Scaffolders write files that Strapi syncs on boot: `scaffoldContentType`, `scaffoldComponent`, `scaffoldConfig` (for example `features` future flags), `scaffoldPlugin`.
4. `seedApp(app, plan, { database })` seeds before boot. `seed(server, plan)` seeds a running server. A plan (`SeedPlan`, in `shared/src/seed/types.ts`) holds locales, admin roles and users, end users, media, entries and API tokens.
5. `startServer(app, { port, database })` boots `strapi develop` and waits for `/_health`. Pass extra variables with the `env` option.
6. `snapshotDatabase(server)` and `restoreDatabase(server)`: SQLite only. The ui fixtures call them for you.
7. `stopAllServers()` in `afterAll`. It also stops a server whose start outlived a timeout.

api: one app and one server per file, on an empty database, with the port and app name from the Vitest worker (`api/tests/helpers.ts`). cli: the same without a `helpers.ts`: compute `worker` from `VITEST_POOL_ID` and the port with `appPort('cli', worker - 1)`, as in `cli/tests/app/lifecycle.cli-test.ts`.

ui: one app per run, generated and built by `ui/setup/global-setup.ts`, and one server per worker. Import `test` and `expect` from `ui/fixtures/app.ts`, never from `@playwright/test`. Choose the reset with `test.use({ resetScope: 'file' })` (default) or `'test'`. Content types can't be scaffolded per spec yet: seed what the spec needs with `seed(server, plan)`.

Start from [references/examples.md](references/examples.md): one api example (with the cli changes) and one ui example.

### 4. Write the test, following the rules

- **Set up data with the scaffolders and seeders.** Never use the old `.tar` / export datasets (`resetDatabaseAndImportDataFromPath`), a transfer to import data, or the `packages/utils/api-tests` builder (`createTestBuilder`). They boot Strapi per step or depend on data you can't read. CLI transfer tests get their token from `POST /api/tests/transfer-token`.
- **Drive Strapi from outside.** HTTP for api and ui, the CLI as a child process for cli. No `global.strapi` and no in-process Strapi (`createStrapiInstance`) in a test: the server is a separate process, like in production.
- **Never raise a timeout to fix a failure.** Read the error, the server logs (`server.logs()`) or the Playwright trace, and fix the cause.
- **Declare what a test needs.** EE features: Vitest `describeEE`, `describeIfFeature` (start the server in an outer `beforeAll`), `requireServerFeature`; Playwright tag `@ee` and `test.use({ requires: { ee: [...] } })`. Future flags only: no `@ee` tag; Playwright `test.use({ requires: { future: [...] } })`, Vitest `requireFeatures(await getInstanceFeatures(server), { future: [...] })`. CE runs skip `describeEE` blocks and leave out `@ee` tests. EE runs replay only `@ee` and `@smoke` ui tests: tag `@smoke` a ui test that must also run there. A missing requirement fails the test, it never skips it. The edition comes from `STRAPI_TEST_EDITION`, never from code.
- **A test passes on its own** (`--grep`, a single file, a shard). Put the data several tests share in `beforeAll`, not in an earlier test. With `resetScope: 'test'`, the restore before each test wipes what `beforeAll` wrote: seed in the test instead.
- **The test plugin routes (`/api/tests/*`) are test helpers that answer loopback requests only.** When a test needs a hook into Strapi, add a route to `shared/test-plugin`, not a public endpoint or an `auth: false` route in the app.
- **Lint runs with `--max-warnings=0`.** Every warning fails, including an `eslint-disable` directive that disables nothing.

### 5. Run it

Run `yarn build` first, and again after a change under `packages/`: the test apps run the workspace packages from their `dist`.

```bash
yarn nx run @strapi/tests-api:test                               # whole suite (also tests-e2e, tests-cli)
yarn nx run @strapi/tests-api:test -- tests/seed                 # files whose path matches
yarn workspace @strapi/tests-api test -t "lists the published"   # Vitest tests by title
yarn workspace @strapi/tests-e2e test --grep "serves the admin"  # Playwright tests by title
yarn nx run @strapi/tests-api:lint
yarn nx run @strapi/tests-api:test:ts
```

Nx splits a quoted argument at its spaces: filter by title with `yarn workspace`, which passes it whole.

Env vars (`TESTS_DATABASE*`, `STRAPI_TEST_EDITION`, `STRAPI_LICENSE`, `TESTS_PORT_BASE`): [README, Run](../../../tests-next/README.md#run).

Two checkouts (worktrees) that run suites at the same time collide on the default ports, and `startServer` fails with `Port … is already in use`. Give each one its own range, for example `TESTS_PORT_BASE=9800`.

## Checklist

- [ ] The domain is migrated in this suite, or this PR migrates it: each old test is rewritten or named in the PR description, and the old folders are deleted.
- [ ] The file is in `tests-next/<suite>/tests/<domain>/` with the suite's suffix.
- [ ] Setup uses the scaffolders and seeders, and the test drives Strapi from outside (HTTP, or the CLI as a child process).
- [ ] Requirements are declared (EE features, future flags, `@smoke`). No timeout was raised.
- [ ] `yarn build` ran after the last change under `packages/`.
- [ ] The test passes alone (single file or title filter), and the whole suite passes.
- [ ] `lint` and `test:ts` pass for the suite, and `yarn prettier --check <changed files>` passes.

## More

- Seed plan fields: `tests-next/shared/src/seed/types.ts`. Test plugin routes: `tests-next/shared/test-plugin/strapi-server.js`.
- Tests to read: `api/tests/scenarios/settings-spike.api-test.ts`, `api/tests/edition/`, `cli/tests/app/lifecycle.cli-test.ts`, `ui/tests/db/`, `ui/tests/edition/` (under `tests-next/`).
