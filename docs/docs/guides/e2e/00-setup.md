---
title: Setup
tags:
  - testing
  - e2e
  - playwright
  - infrastructure
---

## Overview

This document explains at a high level how we create our app instance, run the e2e tests and what technology we're using for e2e tests. As well as a small section on writing tests.

## Get Started

To run the e2e tests, you must first install the playwright browsers.

```shell
npx playwright install
```

### Running Enterprise (EE) tests locally

To run the suite in **Enterprise** mode (or to let `yarn test:e2e` **auto-detect** EE when possible), put your license in the **e2e-specific env file**:

1. Copy `tests/e2e/.env.example` to **`tests/e2e/.env`** (path relative to the **monorepo root**). Do **not** put e2e-only variables in a `.env` at the monorepo root; the runner will not load it.
2. Set **`STRAPI_LICENSE`** to your license string (same role as the GitHub Actions secret `strapiLicense` on CI).

The unified runner (`tests/scripts/run-tests.js`) loads **`tests/e2e/.env`** with `dotenv` before starting Playwright; it does **not** automatically load `.env` from the repository root. Yarn/npm **`cross-env` does not read `.env` files** — only that loader does.

Then use:

| Goal                                                                    | Command            |
| ----------------------------------------------------------------------- | ------------------ |
| Auto (EE if `STRAPI_LICENSE` is set, else CE)                           | `yarn test:e2e`    |
| Always CE (license stripped from the runner process so Strapi stays CE) | `yarn test:e2e:ce` |
| Always EE runner mode (exits if `STRAPI_LICENSE` is missing)            | `yarn test:e2e:ee` |

Full precedence and CI behavior are documented in [CE vs EE and environment variables](#e2e-ce-ee-env) below.

### Default run

Because we require a "fresh" instance to assert our e2e tests against, that is included in the testing script. After `npx playwright install` (and optional EE `.env` above), run:

```shell
yarn test:e2e
```

This will spawn by default a Strapi instance per testing domain (e.g. content-manager) in `test-apps` where the an individual `playwright.config` will start the instance and run tests against. It will automatically link the dependencies from the instance to the monorepo because `test-apps` are not considered part of the monorepo but we want to be using the most recent version of strapi (published or development) therefore meaning our most recent code changes can be tested against.

If you need to clean the test-apps folder because they are not working as expected, run `yarn test:e2e:clean` (that target invokes `run-e2e-tests.js clean`).

### Running specific tests

To run only one domain, meaning a top-level directory in e2e/tests such as "admin" or "content-manager", use the `--domains` option.

```shell
yarn test:e2e --domains=admin
npm run test:e2e -- --domains=admin
```

To pass file filters or Playwright-only flags (`--project`, `--grep`, `--reporter`, `--debug`, …), put them **after** a `--` that follows the runner options. With **npm**, you need an extra `--` so the script receives the rest: `npm run test:e2e -- --domains=admin -- login.spec.ts`.

```shell
# run only login.spec.ts in the admin domain
yarn test:e2e --domains=admin -- login.spec.ts
npm run test:e2e -- --domains=admin -- login.spec.ts
```

You should still scope with `--domains` when filtering by file; otherwise every domain may be invoked and domains without that file can fail with "no tests found".

For **CI, scripts, or automation**, prefer `--reporter=line` after the inner `--` so the run exits without waiting on the HTML reporter.

### Running specific browsers

To run only a specific browser (to speed up test development, for example) you can pass `--project` to playwright with the value(s) `chromium`, `firefox`, or `webkit`

```shell
yarn test:e2e --domains=admin -- login.spec.ts --project=chromium
npm run test:e2e -- --domains=admin -- login.spec.ts --project=chromium
```

To debug your tests with a browser instance and the playwright debugger, you can pass the
`--debug` option like this:

```shell
yarn test:e2e --domains admin -- --debug
yarn test:e2e --domains admin -- login.spec.ts --debug
```

### Concurrency / parallelization

The runner uses `min(number of selected domains, concurrency)` **test apps** (`test-apps/e2e/test-app-*`), each bound to a port `8000 + index` within a batch. **`concurrency` defaults** to the number of domain folders under `tests/e2e/tests/` (not the count after `--domains`). Domains are chunked into batches of that size: domains in a batch run **in parallel**, batches run **one after another**. Spec files **inside** a domain are **serial** (`workers: 1`, `fullyParallel: false` in `playwright.base.config.js`).

```shell
# run at most one domain at a time (simplest logs; fully serial domains)
yarn test:e2e -c 1

# example: at most three domains at once, then the next three, etc.
yarn test:e2e -c 3
```

### Env Variables to Control Test Config

Some helpers have been added to allow you to modify the playwright configuration on your own system without touching the playwright config file used by the test runner.

| env var                          | Description                                                                                                                                                                                                                    | Default                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| PLAYWRIGHT_WEBSERVER_TIMEOUT     | Timeout (ms) for starting the Strapi server                                                                                                                                                                                    | 160000 (160s)                                                  |
| PLAYWRIGHT_ACTION_TIMEOUT        | Playwright action timeout (e.g. `click()`)                                                                                                                                                                                     | 10000 (10s)                                                    |
| PLAYWRIGHT_EXPECT_TIMEOUT        | `expect()` assertion timeout                                                                                                                                                                                                   | 10000 (10s)                                                    |
| PLAYWRIGHT_TIMEOUT               | Per-test timeout                                                                                                                                                                                                               | 90000 (90s)                                                    |
| PLAYWRIGHT_OUTPUT_DIR            | Base for traces/screenshots/videos; each domain uses a subfolder `<domain>-<port>` under that base. Also used as the JUnit output directory when set; when unset, JUnit defaults to `test-apps/junit-reports`.                 | `../test-results` (relative to each generated test app config) |
| PLAYWRIGHT_VIDEO                 | Set `true` to save videos on failed tests                                                                                                                                                                                      | false                                                          |
| PLAYWRIGHT_REUSE_EXISTING_SERVER | If `true` (local only; **ignored when `CI` is set**), Playwright may skip starting Strapi when the test URL already responds — faster if you keep a matching server up, **risky** if edition or license differs from this run. | `false`                                                        |

## Strapi Templates

The test-app you create uses a [template](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/installation/templates.html) under `tests/app-template`. There we store premade content schemas and customisations such as other plugins, custom fields, or endpoints.

If you add anything to the template, be sure to add this information to [the docs](/guides/e2e/app-template).

## Running tests with environment variables (needed to run EE tests) {#e2e-ce-ee-env}

Create **`tests/e2e/.env`** next to the e2e tests (see **`tests/e2e/.env.example`**). **`tests/scripts/run-tests.js`** loads that file with `dotenv` when it exists, then **`tests/utils/e2e-edition.js`** applies CE vs EE so the runner, Playwright, and Strapi agree. Do not rely on the **repository root** `.env` for e2e — it is not loaded unless you change the runner.

Optional: **`STRAPI_DISABLE_LICENSE_PING=true`** in the same file can match CI EE jobs when your license is offline-only (see `.github/actions/run-e2e-tests/script.sh`).

### `STRAPI_E2E_EDITION` (recommended mental model)

| Value | Meaning                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ce`  | Community Edition: `STRAPI_DISABLE_EE=true` for Strapi; `STRAPI_LICENSE` is stripped from the runner env so children cannot boot as EE; EE-only specs are skipped. |
| `ee`  | Enterprise: `STRAPI_DISABLE_EE` cleared; `STRAPI_LICENSE` must be present (and valid for Strapi to boot as EE).                                                    |

**Resolution order** (see `tests/utils/e2e-edition.js`):

1. **`yarn test:e2e:ce`** → always CE (license removed from env for this process).
2. **`yarn test:e2e:ee`** → EE; **exits with an error** if `STRAPI_LICENSE` is missing.
3. Explicit `STRAPI_E2E_EDITION` (`ce` / `ee`) from CI or your shell — `ee` without a license falls back to CE (with a warning) unless you used `test:e2e:ee` (which fails instead).
4. **`yarn test:e2e`** (default) — **auto**: EE if `STRAPI_LICENSE` is non-empty, else CE.

**CI:** `.github/workflows/tests.yml` defines two jobs:

- **`e2e_ce`** — no `STRAPI_LICENSE` secret; composite action runs with `runEE: false` → `script.sh` sets `STRAPI_E2E_EDITION=ce`.
- **`e2e_ee`** — `env STRAPI_LICENSE: ${{ secrets.strapiLicense }}` and `runEE: true` → `STRAPI_E2E_EDITION=ee` and `STRAPI_DISABLE_LICENSE_PING=true`.

The composite action still exports `STRAPI_E2E_EDITION`, but the **`yarn test:e2e` script clears that variable** in the Node process (`cross-env STRAPI_E2E_EDITION= …`). CI therefore relies on **`STRAPI_LICENSE` present vs absent** for **auto** resolution (plus `STRAPI_DISABLE_LICENSE_PING=true` for EE from `script.sh`). Same behavior as local `yarn test:e2e` with or without `.env`.

**Local — Yarn scripts** (`package.json`):

| Script             | Behavior                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn test:e2e`    | Clears any inherited `STRAPI_E2E_EDITION` for this run, then **auto**: EE if `STRAPI_LICENSE` is set in `tests/e2e/.env` (or exported), otherwise CE. |
| `yarn test:e2e:ce` | Always **CE**; license is stripped from env so Strapi cannot start as EE.                                                                             |
| `yarn test:e2e:ee` | **Fails fast** without `STRAPI_LICENSE`; otherwise EE in the runner (Strapi still needs a valid license to boot as Enterprise).                       |

To force CE or EE for a run, use **`yarn test:e2e:ce`** or **`yarn test:e2e:ee`** (do not rely on `STRAPI_E2E_EDITION=… yarn test:e2e` — the `test:e2e` script clears that variable via `cross-env` so auto-detection from `STRAPI_LICENSE` works).

Playwright’s `reuseExistingServer` is **off by default** (see **`PLAYWRIGHT_REUSE_EXISTING_SERVER`** in the **Env Variables to Control Test Config** table) so a process already listening on the test port is not mistaken for this run’s Strapi — edition and env match what `e2e-edition.js` applied.

## Running tests with future flags

If you are writing tests for an unstable future feature you will need to add `app-template/config/features.js`. Currently the app template generation does not take the config folder into consideration. However, the run-e2e-tests script will apply the features config to the generated app. See the documentation for [features.js](https://docs.strapi.io/dev-docs/configurations/features#enabling-a-future-flag)

## What is Playwright?

Playwright enables reliable end-to-end testing for modern web apps. It's cross browser, cross platform and cross language. At Strapi we use it for Javascript automated testing.

For more information check out their [docs](https://playwright.dev/docs/intro). If you're struggling with their APIs, then check out their specific [API documentation](https://playwright.dev/docs/api/class-playwright).

## What makes a good end to end test?

This is the million dollar question. E2E tests typically test complete user flows that touch numerous points of the application it's testing, we're not interested in what happens during a process, only the user perspective and end results. Consider writing them with your story hat on. E.g. "As a user I want to create a new entity, publish that entity, and then be able to retrieve its data from the content API".

Our E2E test suite should _at minimum_ cover the core business flows of the product and this is lead by the QA defined set for this. Consult with your QA if you're not sure.
