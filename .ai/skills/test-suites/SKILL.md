---
name: test-suites
description: Use when writing, migrating, fixing or reviewing a test under `tests-next/` (the api, ui and cli suites of the Test Infrastructure Overhaul), when migrating a test domain from `/tests` to `tests-next/`, or when deciding where a new Strapi test goes (`/tests` or `tests-next/`). Trigger on any edit to a `*.api-test.ts`, `*.ui-test.ts` or `*.cli-test.ts` file or under `tests-next/shared/`. Not for unit or frontend tests in `__tests__/`, nor for tests of a domain that is still in `/tests`.
---

# Test suites (`tests-next/`)

Source of truth: [tests-next/README.md](../../../tests-next/README.md) and the code in `tests-next/shared/src`. The README holds the details (generated apps, ports, databases, resets, edition). This skill is the procedure. Do not copy the README into a test or a doc.

`tests-next/` holds the new suites. They replace `/tests` domain by domain.

At the M6 cutover (CMS-1985), `tests-next/` becomes `tests/`: update the paths and the D1 section of this skill then.

## Procedure

### 1. Decide where the test goes (D1)

A domain (`settings`, `i18n`, `content-releases`…) lives in exactly one suite tree.

- Migrated domain: write the test in `tests-next/`.
- Not migrated yet: write it in `/tests`, with the old patterns. This skill stops here.
- Migration PR open for the domain: coordinate with it. Do not add tests on either side without telling its author.

A domain is migrated when `tests-next/<suite>/tests/<domain>/` exists and its old folder is gone: `tests/e2e/tests/<domain>`, `tests/api/core/<domain>`, `tests/api/plugins/<domain>` or `tests/cli/tests/<domain>`. Each migration PR deletes the old folder. The folders `app/`, `db/`, `edition/`, `scaffold/`, `seed/`, `test-plugin/` and `scenarios/` test the suites themselves: they are not domains.

To migrate a domain, move its tests to `tests-next/`, delete the old folder in the same PR, and rewrite the setup with step 3. Do not port the old helpers.

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
5. `startServer(app, { port, database })` boots `strapi develop` and waits for `/_health`. `appEnv` builds the env it runs with; pass extra variables with the `env` option.
6. `snapshotDatabase(server)` and `restoreDatabase(server)`: SQLite only. The ui fixtures call them for you.
7. `stopAllServers()` in `afterAll`. It also stops a server whose start outlived a timeout.

api and cli: one app and one server per file, on an empty database, with the port and app name from the Vitest worker (`api/tests/helpers.ts`).

ui: one app per run, generated and built by `ui/setup/global-setup.ts`, and one server per worker. Import `test` and `expect` from `ui/fixtures/app.ts`, never from `@playwright/test`. Choose the reset with `test.use({ resetScope: 'file' })` (default) or `'test'`. Content types can't be scaffolded per spec yet: seed what the spec needs with `seed(server, plan)`.

Start from [references/examples.md](references/examples.md): one api example and one ui example.

### 4. Write the test, following the rules

- **Set up data with the scaffolders and seeders.** Never use the old `.tar` / export datasets (`resetDatabaseAndImportDataFromPath`), the transfer token, or the `packages/utils/api-tests` builder (`createTestBuilder`). They boot Strapi per step or depend on data you can't read.
- **Talk to the server over HTTP.** No `global.strapi` and no in-process Strapi (`createStrapiInstance`) in a test: the server is a separate process, like in production.
- **Never raise a timeout to fix a failure.** Read the error, the server logs (`server.logs()`) or the Playwright trace, and fix the cause.
- **EE tests declare what they need.** Vitest: `describeEE`, `describeIfFeature` (start the server in an outer `beforeAll`), `requireServerFeature`. Playwright: tag the test `@ee` and set `test.use({ requires: { ee: [...], future: [...] } })`. In an EE run, a missing feature fails the test instead of skipping it. In a CE run, EE blocks and `@ee` tests are skipped by design. The edition comes from `STRAPI_TEST_EDITION`, never from code.
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

| Variable                                             | Default   | Effect                                                                    |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| `TESTS_DATABASE`                                     | `sqlite`  | `postgres` or `mysql` for the api and cli suites. The ui suite is SQLite. |
| `TESTS_DATABASE_HOST`, `_PORT`, `_USER`, `_PASSWORD` | CI values | Connection to the database server.                                        |
| `STRAPI_TEST_EDITION`                                | `ce`      | `ee` needs `STRAPI_LICENSE`; the run fails if Strapi boots as CE.         |
| `STRAPI_LICENSE`                                     |           | License of EE runs. CE runs remove it from the app env.                   |
| `TESTS_PORT_BASE`                                    | `8600`    | First port. ui uses `+0`, api `+20`, cli `+40`.                           |

Two checkouts (worktrees) that run suites at the same time collide on the default ports, and `startServer` fails with `Port … is already in use`. Give each one its own range, for example `TESTS_PORT_BASE=9800`.

## Checklist

- [ ] The domain is migrated, or this PR migrates it and deletes the old folder.
- [ ] The file is in `tests-next/<suite>/tests/<domain>/` with the suite's suffix.
- [ ] Setup uses the scaffolders and seeders, and the test talks to the server over HTTP only.
- [ ] EE requirements are declared. No timeout was raised.
- [ ] The test passes alone (single file or title filter).
- [ ] `lint` and `test:ts` pass for the suite. Prettier was run.

## More

- Seed plan fields: `tests-next/shared/src/seed/types.ts`. Test plugin routes: `tests-next/shared/test-plugin/strapi-server.js`.
- Tests to read: `api/tests/scenarios/settings-spike.api-test.ts`, `api/tests/edition/`, `ui/tests/db/`, `ui/tests/edition/` (under `tests-next/`).
