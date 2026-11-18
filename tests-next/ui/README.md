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

- **UI mode**: global setup (app generation and admin build, about 10 s) runs when the UI opens,
  and every run in that window reuses it. After a `yarn build`, or to start from a fresh app,
  reopen the UI or rerun global setup from its Settings panel. Each run starts the Strapi
  server again, and the Stop button stops it.
- **VS Code**: install the Playwright Test extension and open the repo root. The extension
  finds `tests-next/ui/playwright.config.ts`; select it in the Testing view if it lists other
  configs. It uses the same global setup: after a `yarn build`, rerun it from the extension
  settings. Set env vars such as `TESTS_WEBKIT` with the `playwright.env` setting.

Run `npx playwright` from `tests-next/ui`, or pass `--config tests-next/ui/playwright.config.ts`:
from another folder, it doesn't use this config.

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

## Environment variables

| Variable              | Default | Effect                                                         |
| --------------------- | ------- | -------------------------------------------------------------- |
| `TESTS_WEBKIT`        | unset   | `true` adds the `webkit` project locally                       |
| `CI`                  | unset   | Adds the `webkit` project, forbids `test.only`, JUnit and HTML |
| `STRAPI_TEST_EDITION` | `ce`    | `ee` runs the `@ee` and `@smoke` tests only                    |
| `TESTS_PORT_BASE`     | `8600`  | First port of the suites; the ui suite uses the first range    |
