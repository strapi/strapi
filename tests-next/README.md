# /tests-next

The new test suites of the Test Infrastructure Overhaul. They replace `/tests` domain by domain,
and the folder is renamed `/tests` at the cutover.

| Workspace | Package                | Runner                                                       |
| --------- | ---------------------- | ------------------------------------------------------------ |
| `shared/` | `@strapi/tests-shared` | Foundation: app generation and server lifecycle, test plugin |
| `ui/`     | `@strapi/tests-e2e`    | Playwright, `*.ui-test.ts`                                   |
| `api/`    | `@strapi/tests-api`    | Vitest, `*.api-test.ts`                                      |
| `cli/`    | `@strapi/tests-cli`    | Vitest, `*.cli-test.ts`                                      |

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
  doesn't reach the test apps.
- **One ui worker** for now: each worker will need its own app and database first.
- **Windows** is not supported yet: stopping a server signals its process group.
