---
name: test-suites
description: Use when writing, fixing or reviewing a test in `tests-next/` (`*.api-test.ts`, `*.ui-test.ts`, `*.cli-test.ts`, `tests-next/shared/`), when migrating a test domain from `tests/` to `tests-next/`, or when deciding whether a new API, E2E or CLI test goes in `tests/` or `tests-next/`. Not for unit or frontend tests in `__tests__/`.
---

# Test suites (`tests-next/`)

Details (generated apps, ports, databases, resets, edition): [tests-next/README.md](../../../tests-next/README.md). ui suite (fixtures, roles, seeding, Page Objects, app reuse, WebKit): [tests-next/ui/README.md](../../../tests-next/ui/README.md). Helpers: `tests-next/shared/src`.

## Procedure

### 1. Decide where the test goes

In each suite, a domain (`settings`, `i18n`, `content-releases`…) lives in exactly one tree: `tests/` or `tests-next/`.

- Migrated domain: write the test in `tests-next/`.
- Not migrated yet: write it in `tests/`, with the old patterns. This skill stops here. This includes a domain with no folder in either tree (a new feature, or no tests in this suite yet): its first test goes to `tests/`, because the `tests_next_*` CI jobs don't run on `packages/` changes yet.
- Migration PR open for the domain: look for an open PR that adds `tests-next/<suite>/tests/<domain>/` (`gh pr list --repo strapi/strapi --search "tests-next <domain>"`). If one exists, stop and tell the user.

Migration is per suite. A domain is migrated in a suite when `tests-next/<suite>/tests/<domain>/` exists and the suite's old folders are gone: ui, `tests/e2e/tests/<domain>`; api, `tests/api/core/<domain>` and `tests/api/plugins/<domain>`; cli, `tests/cli/tests/strapi/<domain>` and `tests/cli/tests/create-strapi-app`. Old folder names can differ from the domain (`media-library` and `upload`): match by what the tests cover, and ask when unsure.

Some folders of `tests-next/<suite>/tests/` test the suites themselves and are not domains: `app/`, `db/`, `edition/`, `scaffold/`, `seed/`, `test-plugin/`, `scenarios/` (api), `auth/` and `fixtures/` (ui). `ui/tests/auth/` checks the role login fixture: a new login test goes where the login domain lives (`tests/e2e/tests/admin/` until `admin` is migrated in ui).

To migrate a domain, rewrite each test of its old folders in `tests-next/` with step 3: keep its name, tags, intent and assertions, and do not port the old helpers. ui: also follow [Migrating a domain](../../../tests-next/ui/README.md#migrating-a-domain). Done when each old test is migrated, or named in the PR description with the reason it was dropped. Delete the old folders in the same PR only when the suite's `tests_next_*` job runs on `packages/` changes (`tests_next` in `.github/filters.yaml`), and in EE if the old tests ran in EE. Until then, stop and tell the user: deleting them removes coverage that CI does not replace.

### 2. Pick the suite

| Workspace | Package                | Runner     | File suffix    | What goes there                                          |
| --------- | ---------------------- | ---------- | -------------- | -------------------------------------------------------- |
| `api/`    | `@strapi/tests-api`    | Vitest     | `.api-test.ts` | HTTP tests against a running server (Content API, admin) |
| `ui/`     | `@strapi/tests-e2e`    | Playwright | `.ui-test.ts`  | Admin panel tests in a browser                           |
| `cli/`    | `@strapi/tests-cli`    | Vitest     | `.cli-test.ts` | `strapi` and `create-strapi-app` commands                |
| `shared/` | `@strapi/tests-shared` | none       |                | Helpers and the test plugin. No tests.                   |

Put the file in `tests-next/<suite>/tests/<domain>/`.

### 3. Set up the app

api and cli: follow [Set up an app](../../../tests-next/README.md#set-up-an-app). One app and one server per file, on an empty database, with the app name and port from the Vitest worker; `stopAllServers()` in `afterAll`. Tests that need another config (a plugin option, a future flag) go in their own file. When one file must test two configs, `await stopServer(server)`, scaffold, then `startServer` again.

ui: follow [Writing a test](../../../tests-next/ui/README.md#writing-a-test). One app per run with the content types of `ui/setup/schema.ts`: add one there when a spec needs it. The ui app can't get a future flag yet: a spec that needs one stops here, tell the user.

Start from [references/examples.md](references/examples.md): one api example (with the cli changes) and one ui example.

### 4. Write the test, following the rules

- **Set up data with the scaffolders and seeders.** Never use the old `.tar` / export datasets (`resetDatabaseAndImportDataFromPath`), a transfer to import data, or the `packages/utils/api-tests` builder (`createTestBuilder`). They boot Strapi per step or depend on data you can't read. For CLI transfer tests, `POST /api/tests/transfer-token` creates the transfer token, and the test passes `TEST_TRANSFER_TOKEN_ACCESS_KEY` (`@strapi/tests-shared`).
- **Drive Strapi from outside.** HTTP for api and ui, the CLI as a child process for cli. No `global.strapi` and no in-process Strapi (`createStrapiInstance`) in a test: the server is a separate process, like in production.
- **Never raise a timeout to fix a failure.** Read the error, the server logs (`server.logs()`) or the Playwright trace, and fix the cause.
- **Declare what a test needs.** EE features: Vitest `describeEE`, `describeIfFeature` (start the server in an outer `beforeAll`), `requireServerFeature`; Playwright tag `@ee` and `test.use({ requires: { ee: [...] } })`. Future flags only: no `@ee` tag; Playwright `test.use({ requires: { future: [...] } })`, Vitest `requireFeatures(await getInstanceFeatures(server), { future: [...] })`. CE runs skip `describeEE` blocks and leave out `@ee` tests. EE runs replay only `@ee` and `@smoke` ui tests: tag `@smoke` a ui test that must also run there. A missing requirement fails the test, it never skips it. The edition comes from `STRAPI_TEST_EDITION`, never from code.
- **A test passes on its own** (`--grep`, a single file, a shard). Put the data several tests share in `beforeAll` (ui: `seedPlan`), not in an earlier test.
- **The test plugin routes (`/api/tests/*`) are test helpers that answer loopback requests only.** When a test needs a hook into Strapi, add a route to `shared/test-plugin`, not a public endpoint or an `auth: false` route in the app.
- **Lint runs with `--max-warnings=0`.** Every warning fails, including an `eslint-disable` directive that disables nothing.

### 5. Run it

Commands and env vars: [README, Run](../../../tests-next/README.md#run) and [ui README, Run](../../../tests-next/ui/README.md#run). Run `yarn build` first, and again after a change under `packages/`. To run part of a suite, or to check it:

```bash
yarn nx run @strapi/tests-api:test -- tests/seed                 # files whose path matches
yarn workspace @strapi/tests-api test -t "lists the published"   # Vitest tests by title
yarn workspace @strapi/tests-e2e test --grep "serves the admin"  # Playwright tests by title
yarn nx run @strapi/tests-api:lint
yarn nx run @strapi/tests-api:test:ts
```

Nx splits a quoted argument at its spaces: filter by title with `yarn workspace`, which passes it whole.

Two checkouts (worktrees) that run suites at the same time collide on the default ports, and `startServer` fails with `Port … is already in use`. Give each one its own range, for example `TESTS_PORT_BASE=9800`.

## Checklist

- [ ] The domain is migrated in this suite, or this PR migrates it: each old test is migrated or named in the PR description, and the old folders are deleted once CI runs the suite on `packages/` changes.
- [ ] The file is in `tests-next/<suite>/tests/<domain>/` with the suite's suffix.
- [ ] Setup uses the scaffolders and seeders, and the test drives Strapi from outside (HTTP, or the CLI as a child process).
- [ ] Requirements are declared (EE features, future flags, `@smoke`). No timeout was raised.
- [ ] `yarn build` ran after the last change under `packages/`.
- [ ] The test passes alone (single file or title filter), and the whole suite passes.
- [ ] `lint` and `test:ts` pass for the suite, and `yarn prettier --check <changed files>` passes.

## More

- Test plugin routes: `tests-next/shared/test-plugin/strapi-server.js`.
- Tests to read: `api/tests/scenarios/settings-spike.api-test.ts`, `api/tests/edition/`, `ui/tests/settings/rbac/`, `ui/tests/edition/` (under `tests-next/`).
