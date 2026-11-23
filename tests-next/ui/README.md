# @strapi/tests-e2e

The UI suite of `/tests-next`: Playwright tests named `*.ui-test.ts`, in `tests/`. Shared
behaviour (apps, ports, databases, resets, edition) is in the [`/tests-next` README](../README.md).

## Before the first run

```bash
yarn install
yarn build                                  # again after changing anything under packages/
yarn playwright install chromium webkit     # once per Playwright version
```

## Run

The config is [`playwright.config.ts`](./playwright.config.ts). Each way to run it below uses
the same config, so the same projects, edition filter and global setup apply.

```bash
# From the repo root, like CI
yarn nx run @strapi/tests-e2e:test
yarn nx run @strapi/tests-e2e:test -- --project=chromium tests/app

# From tests-next/ui
cd tests-next/ui
yarn test                                   # same as `npx playwright test`
npx playwright test tests/app/browser.ui-test.ts
npx playwright test --ui                    # UI mode
```

- **UI mode**: global setup (see [The app](#the-app)) runs when the UI opens, and every run in
  that window reuses it. After a `yarn build`, reopen the UI or rerun global setup from its
  Settings panel. Each run starts the Strapi server again, and the Stop button stops it.
- **VS Code**: see [VS Code](#vs-code).

Run `npx playwright` from `tests-next/ui`, or pass `--config tests-next/ui/playwright.config.ts`:
from another folder, it doesn't use this config.

## The app

Global setup prepares one app, `test-apps/next/ui`, and builds its admin panel. The next runs
reuse both when nothing that shapes them changed (`prepareApp` in `@strapi/tests-shared`), which
saves about 10 s per run and keeps every file of the app as it was:

- The app is regenerated when the Strapi version, the generation code
  (`tests-next/shared/src/app/generate*` and `config.ts`, the test plugin entry) or
  create-strapi-app (`dist`, `templates`) changed.
- The admin panel is rebuilt with the app, when `build/` is missing, when a `STRAPI_*` env var of
  the run changed, or when a package under `packages/` was built again (`yarn build`,
  `yarn watch`).
- `TESTS_REGENERATE=true` deletes the app and starts from a new one. Deleting
  `test-apps/next/ui` does the same.

Global setup prints what it did, for example `ui app reused, admin reused in 0.2 s`. CI always
starts from a fresh checkout, so it always generates and builds.

## VS Code

Install the Playwright Test extension (`ms-playwright.playwright`) and open the repo root. The
extension finds `tests-next/ui/playwright.config.ts`; select it in the Testing view if it lists
other configs. Set env vars such as `TESTS_WEBKIT` with the `playwright.env` setting.

- **Projects**: the extension shows its Projects section only when the config has two projects
  or more. Locally the config has `chromium` only, so the section is hidden. Set
  `"playwright.env": { "TESTS_WEBKIT": "true" }` to see and pick `chromium` and `webkit`.
- **Runs that end with no result**: the extension restarts its test server when a file named
  `*.env*` changes anywhere in the workspace, which drops the run in progress (grey icon, "The
  test case did not report any output"). Generating the app writes its `.env`, so the first run
  on a new app (first run, `TESTS_REGENERATE=true`, or a change that regenerates it) can end that
  way. Run it again: the app is then reused and its `.env` stays as it is. To avoid it, add this
  to your `.vscode/settings.json`:

  ```json
  { "files.watcherExclude": { "**/test-apps/**": true } }
  ```

## Projects

| Project    | Browser        | Server mode | Runs                                     |
| ---------- | -------------- | ----------- | ---------------------------------------- |
| `chromium` | Desktop Chrome | `develop`   | always                                   |
| `webkit`   | Desktop Safari | `develop`   | in CI (`CI` set), or `TESTS_WEBKIT=true` |

```bash
TESTS_WEBKIT=true yarn test                       # both projects
TESTS_WEBKIT=true yarn test --project=webkit      # WebKit only
```

Without `TESTS_WEBKIT=true` or `CI`, `--project=webkit` fails with `Project(s) "webkit" not
found`.

The server mode (`serverMode`) is a project option, read by the worker fixture in
[`fixtures/app.ts`](./fixtures/app.ts). A project for another mode only adds an entry to
`projects`, with no change to the fixtures. Only `develop` exists today.

CI runs each project in its own `tests-next ui` job (`--project=<name>`), with one worker and
no sharding. One app per worker and sharding come with CMS-2483.

## Roles

A test starts logged in as a role, with no login form. Pick it with the `role` option of
[`fixtures/app.ts`](./fixtures/app.ts):

```ts
import { test } from '../../fixtures/app';

test.use({ role: 'editor' }); // 'admin' (default, Super Admin), 'editor', 'author', or null
```

| `role`   | Admin user (`CREDENTIALS` in [`fixtures/auth.ts`](./fixtures/auth.ts)) | Strapi role |
| -------- | ---------------------------------------------------------------------- | ----------- |
| `admin`  | `admin@tests.strapi.io`                                                | Super Admin |
| `editor` | `editor@tests.strapi.io`                                               | Editor      |
| `author` | `author@tests.strapi.io`                                               | Author      |
| `null`   | none: the page starts logged out                                       |             |

Once per worker, before the database snapshot, the `server` fixture creates the three users and
logs each one in through `POST /admin/login`. It saves one storage state per role (refresh
cookie, and the access token in localStorage) under
`test-results/.auth/<project>-<port>/<role>.json`. The users and their sessions are in the
snapshot, so every reset keeps them. A test that logs out or logs in again only changes the
database until the next reset.

Only [`tests/auth/login.ui-test.ts`](./tests/auth/login.ui-test.ts) drives the login form
(`role: null`). Use the `baseURL` (the worker's server) for navigation: `page.goto('/admin')`.

## Environment variables

| Variable              | Default | Effect                                                         |
| --------------------- | ------- | -------------------------------------------------------------- |
| `TESTS_WEBKIT`        | unset   | `true` adds the `webkit` project locally                       |
| `CI`                  | unset   | Adds the `webkit` project, forbids `test.only`, JUnit and HTML |
| `STRAPI_TEST_EDITION` | `ce`    | `ee` runs the `@ee` and `@smoke` tests only                    |
| `TESTS_PORT_BASE`     | `8600`  | First port of the suites; the ui suite uses the first range    |
| `TESTS_REGENERATE`    | unset   | `true` regenerates the app and rebuilds its admin panel        |
