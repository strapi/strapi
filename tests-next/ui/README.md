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

## Writing a test

Import `test` and `expect` from [`fixtures`](./fixtures/index.ts) (`@strapi/tests-e2e/fixtures`),
never from `@playwright/test`: tests in this folder use the relative path, `../../fixtures`.

```ts
import { expect, test } from '../../fixtures';

// Data the tests of this file share, seeded once after the file's reset.
test.use({ seedPlan: { adminRoles: [{ name: 'Reviewer' }] } });

// The page starts logged in as the Super Admin (`role: 'admin'`, default).
test('opens the seeded role', async ({ page, seeded }) => {
  const [reviewer] = seeded.adminRoles; // { id, name, code }
  await page.goto(`/admin/settings/roles/${reviewer.id}`); // baseURL is the worker's server
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Reviewer');
});

test.describe('as an editor', () => {
  test.use({ role: 'editor' });

  test('cannot open the seeded role', async ({ page, seeded }) => {
    await page.goto(`/admin/settings/roles/${seeded.adminRoles[0].id}`);
    // ...
  });
});

test('blocks an end user', async ({ seed, unique }) => {
  const username = unique('reader');
  // Data for this test only, typed after the plan: `users` is there, `locales` is not.
  const { users } = await seed({
    users: [{ username, email: `${username}@example.com`, password: 'Testing123!' }],
  });
  // ...
});
```

- **`role`**: the page starts logged in as `'admin'` (default, Super Admin), `'editor'` or
  `'author'` with `test.use({ role })`, or logged out with `null`. `ROLES` and `CREDENTIALS`
  come from the entry too. See [Roles](#roles).
- **`resetScope`**: the database goes back to the worker's snapshot before each file (`'file'`,
  default), so a file's `beforeAll` and tests share data, or before each test
  (`test.use({ resetScope: 'test' })`). See [Resets](../README.md).
- **Seeding**: a `SeedPlan` (locales, admin roles and users, end users, media, entries, API
  tokens; see [Set up an app](../README.md#set-up-an-app)) goes through the running server.
  - `test.use({ seedPlan })` + `seeded`: seeded on the first use after a reset, then reused:
    once per file with `file` scope, once per test with `test` scope.
  - `seed(plan)`: in a test, `beforeEach` or a file-scope `beforeAll`. It returns the created ids,
    documentIds and access keys. With `test` scope it throws in `beforeAll`, whose data the reset
    would wipe before the first test.
  - `unique(label)`: a name no other call returns in the worker, for names and emails a file
    creates more than once. Plans in `test.use` are static: give their names by hand, different
    in each `describe` of a file (API token names and admin emails are unique).
- **Edition and features**: tag EE-only tests `@ee` (CE runs leave them out); declare what a
  test needs with `test.use({ requires: { ee: [...], future: [...] } })`, which fails the test
  when the instance lacks it; read the instance with the `features` fixture. See
  [Edition](../README.md#edition).
- **Server**: the `server` fixture is the worker's Strapi server (`server.url`, `server.app`).

There is no `sharedSetup`: the per-file reset and `seedPlan` give each file its own data, and
`role` its login, with no module-level registry of setup ids that two files could share.

## Page Objects and interactions

Selectors live in Page Objects, never in tests. When the selector strategy changes (test ids, a
design-system update), only Page Objects change.

| Folder                                       | What                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`pages/`](./pages/index.ts)                 | One class per page of the panel, grouped like the panel's URLs (`pages/settings/roles-page.ts`, `pages/settings/users-permissions/roles-page.ts`, `pages/content-manager/edit-view-page.ts`) |
| [`components/`](./components/index.ts)       | UI shared by pages: `Navigation` (main menu, Settings menu), `ConfirmDialog`                                                                                                                 |
| [`pages/responses.ts`](./pages/responses.ts) | `adminResponse(page, method, pathname)`: waits for the admin API call a click causes                                                                                                         |

Tests create Page Objects with `new`, from the page they drive. Example from
[`tests/settings/rbac/create-role.ui-test.ts`](./tests/settings/rbac/create-role.ui-test.ts):

```ts
import { expect, test } from '../../../fixtures';
import { RolePage, RolesPage } from '../../../pages';

test('Super Admin can create a new role', { tag: ['@critical'] }, async ({ page }) => {
  const roles = new RolesPage(page);
  const role = new RolePage(page);

  await roles.goto();
  await roles.addRole();
  await role.fill({ name: 'Publisher', description: 'Role with publishing capabilities' });
  await role.permission('Publish', 'article').check();
  await role.create();

  await roles.open(); // through the main navigation and the Settings menu
  await expect(roles.cell('Publisher', 'Role with publishing capabilities')).toBeVisible();
});
```

- **Constructors, not a fixture.** A Page Object only needs a `Page`, so `new RolesPage(page)`
  works the same for the test's page and for a second context opened as another role
  (`storageStates`). The fixtures stay about the app, roles and data.
- **One class per page, component objects for shared UI.** A page opens itself (`goto()` by URL,
  `open()` through `Navigation`) and waits until it shows (its heading or first field). The menus
  are in `Navigation` only, so a menu change is fixed in one place. A page a test only opens and
  never acts on gets no class: [`SettingsPage`](./pages/settings/settings-page.ts) opens any
  Settings page by section and link and exposes its `heading(name)` (the Settings smoke test).
  Two pages with the same title get names that say which one (`RolesPage` for admin roles,
  `UsersPermissionsRolesPage` for end-user roles).
- **Page Objects act and expose locators; tests assert.** `roles.row('Editor')`,
  `role.permission('Read', 'article')` and `user.roles` are locators the test checks with
  `expect`. Waiting for the page to be ready (`await expect(this.heading).toBeVisible()`) is the
  only `expect` inside a Page Object.
- **Selectors**: roles and accessible names (`getByRole`, `getByText`), scoped to a landmark or a
  row (`navigation 'Settings'`, `row.filter({ has: gridcell })`), `exact: true` when a name is a
  prefix of another (`Editor` / `Super Editor`, `Settings` / `Profile settings`). No positional index (`nth()`, `.last()`), XPath, `'..'` or CSS selectors: a legacy one
  that uses them is rewritten from the page's accessibility tree, not ported. `.first()` only
  picks between copies of one control (`Add new role` shows above and below the list).
  [`RolesPage.row`](./pages/settings/roles-page.ts) replaces a substring row match,
  [`Navigation.settingsLink`](./components/navigation.ts) replaces the XPath of `navToHeader`.
- **Waits**: no `networkidle`, no `clickAndWait`, no `waitForTimeout`. After a click, wait for
  what it causes: a locator (`expect(dialog).toBeHidden()`), a URL
  (`expect(page).toHaveURL(/roles\/\d+$/)` after creating a role), or the API response when
  nothing visible changes (`RolePage.save()`):

  ```ts
  const saved = adminResponse(this.page, 'PUT', /^\/admin\/roles\/\d+$/);
  await this.page.getByRole('button', { name: 'Save' }).click();
  await saved; // throws when the response isn't a success
  ```

- **Content types**: tests use the content types of [`setup/schema.ts`](./setup/schema.ts),
  written into the app by global setup before any server starts (the role specs need `article`
  in the permission matrix). Add one there when a migrated spec needs it.

## Generated specs (no-code E2E, PoC)

`tests/generated/` holds specs generated from the Markdown scenarios of [`scenarios/`](./scenarios/README.md)
by the `No-code E2E` workflows: don't edit them by hand, change their scenario. See
[`no-code-e2e/README.md`](./no-code-e2e/README.md).

## Migrating a domain

The legacy suite (`tests/e2e`) moves here domain by domain (`settings` first, CMS-1956).

- **Where a new test goes**: where its domain lives at that moment, `tests/e2e` until the domain
  is migrated, `tests-next/ui` after. While a migration PR for a domain is open, new tests for
  that domain are agreed with its author and migrated in the same PR. The legacy folder is not
  frozen as a whole.
- **Moved, not rewritten**: a migrated test keeps its name, tags, intent and assertions. Only
  what this suite does differently changes: setup (`role` instead of UI logins, `seedPlan` /
  `seed` instead of DTS imports and `sharedSetup`), selectors (into Page Objects) and forbidden
  waits. Each test is independent: it seeds what it needs and never relies on another test.

- **Same place, new suffix**: `tests/e2e/tests/<domain>/<path>/<name>.spec.ts` becomes
  `tests/<domain>/<path>/<name>.ui-test.ts` (`rbac/scenarios/create-new-role.scenario.ui-test.ts`).
- **Check the data the test relies on, not only its steps.** The legacy DTS packets (`with-admin`)
  are not the app's defaults: there, the built-in Author role can publish articles; in this app it
  can't. When a test relies on such a difference, seed the state it needs (a role with its own
  `permissions`, a user, entries) instead of changing a built-in role or user the other files log
  in with. Walk the flow in the browser first, as the role and the data the test will have.
- **The app is a plain create-strapi-app** (Users & Permissions, plus the plugins of
  `@strapi/strapi`): no Documentation plugin, unlike the legacy test app. A step that needs a
  plugin the app doesn't have is dropped and listed in the inventory with that reason.
- **Editions**: a legacy test that runs in both editions and must keep running in EE runs gets
  `@smoke` (EE runs replay `@ee` and `@smoke` only). `describeOnCondition(edition === 'EE')`
  becomes `@ee` plus `test.use({ requires: { ee: [...] } })` with the license features it shows.
- **Logins as another user**: a second context as a built-in role uses
  `browser.newContext({ storageState: storageStates.author })`; a seeded user logs in with
  `logIn` (see [Roles](#roles)). A logout and a login form in the middle of a legacy test become
  that second context, unless the login itself is what the test checks.
- **Names the test creates**: `--repeat-each` runs a file again before its next reset, so a
  test that creates a user, role or end user with a fixed name fails on its second run. Use
  `unique(label)` (legacy tests used `Date.now()` because nothing reset end users).

Checklist for each migration PR:

1. **Inventory**: list every legacy test of the migrated files, and say where each one went
   (file and test name) or why it was dropped.
2. **Delete the legacy files** in the same PR, with their entries in
   `tests/e2e/shard-weights.json` and any legacy helper only they used. When the whole domain
   goes, also remove it from `DOMAIN_WEIGHTS` in `tests/scripts/run-tests.js` and from examples
   that name it. The legacy runner lists its domains from the folders of `tests/e2e/tests`, so
   no list needs editing; check it still starts (`yarn test:e2e --domains search -- --list`).
3. **Runtime**: give the runtime of the migrated tests next to the legacy baseline (a local run
   of the legacy specs, or their `tests/e2e/shard-weights.json` CI weights). Run the legacy
   suite with its own `HOME` (`HOME=$PWD/.e2e-home`, keeping `PLAYWRIGHT_BROWSERS_PATH`):
   its setup runs `yalc push`, which updates the legacy test apps of every other checkout on the
   machine.
4. **Check that each migrated test can fail**: break the step it checks (skip the save, the
   permission change) and see it fail on the assertion it exists for.

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
[`fixtures/app.ts`](./fixtures/app.ts), exported by the [entry](#writing-a-test):

```ts
import { test } from '../../fixtures';

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
cookie, the access token in localStorage, and the guided tour turned off, `GUIDED_TOUR_OFF`) under
`test-results/.auth/<project>-<port>/<role>.json`. The users and their sessions are in the
snapshot, so every reset keeps them. A test that logs out or logs in again only changes the
database until the next reset.

Only [`tests/auth/login.ui-test.ts`](./tests/auth/login.ui-test.ts) drives the login form
(`role: null`). Use the `baseURL` (the worker's server) for navigation: `page.goto('/admin')`.

### Another user in the same test

A test that acts as two users (the Super Admin changes a role, then its user checks what it can
do) opens a second browser context. Contexts from the `browser` fixture get the project's
options, `baseURL` included.

```ts
import { accessToken, logIn, test } from '../../fixtures';

// A built-in role: its saved storage state.
test('as the author too', async ({ browser, storageStates }) => {
  const context = await browser.newContext({ storageState: storageStates.author });
  // ...
  await context.close();
});

// A custom role: seed the role and a user, then log the user in through the API.
test('as a seeded user', async ({ browser, server, seed, unique }) => {
  const credentials = { email: `${unique('publisher')}@tests.strapi.io`, password: 'Testing123!' };
  await seed({
    adminRoles: [
      {
        name: 'Publisher',
        code: 'publisher',
        permissions: [
          { action: 'plugin::content-manager.explorer.publish', subject: 'api::article.article' },
        ],
      },
    ],
    adminUsers: [{ ...credentials, firstname: 'A', lastname: 'Publisher', roles: ['publisher'] }],
  });
  const { storageState, token } = await logIn(server, credentials);
  const context = await browser.newContext({ storageState });
  // `token`: the user's bearer token for admin API calls.
  await context.close();
});
```

- **`logIn(server, { email, password })`** ([`fixtures/auth.ts`](./fixtures/auth.ts)) is the
  login the role users get, for any admin user: `POST /admin/login`, then a storage state with the
  access token and the guided tour off, and the token itself.
- **`accessToken(storageStates.admin)`**: the bearer token saved in a role's storage state, for
  admin API calls without another login.
- **Rate limit**: `admin::rateLimit` allows 5 login attempts per email and IP in 5 minutes. Each
  `logIn` is one, so give a seeded user a `unique` email.

## Environment variables

| Variable              | Default | Effect                                                         |
| --------------------- | ------- | -------------------------------------------------------------- |
| `TESTS_WEBKIT`        | unset   | `true` adds the `webkit` project locally                       |
| `CI`                  | unset   | Adds the `webkit` project, forbids `test.only`, JUnit and HTML |
| `STRAPI_TEST_EDITION` | `ce`    | `ee` runs the `@ee` and `@smoke` tests only                    |
| `TESTS_PORT_BASE`     | `8600`  | First port of the suites; the ui suite uses the first range    |
| `TESTS_REGENERATE`    | unset   | `true` regenerates the app and rebuilds its admin panel        |
