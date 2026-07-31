# CLI Tests

## Overview

CLI tests use Jest to test Strapi CLI commands and functionality. They share the same infrastructure as e2e tests:

- **Shared app template**: Both test types use `tests/app-template` to generate test applications
- **Shared utilities**: Common test utilities are in `tests/utils/`
- **Shared runners**: Test app setup and management is handled by `tests/utils/runners/shared-setup.js`
- **Unified test runner**: Both use `tests/scripts/run-tests.js` with different execution strategies

The main difference is that CLI tests use Jest for test execution, while e2e tests use Playwright for browser automation.

## Running the tests

Run `yarn test:cli` to begin. The command will generate the required number of test applications based on the shared app-template, seed them with preconfigured data [not yet implemented], then run the test suites (or "domains").

The `-c X` option can be used to limit the number of concurrently running domains, where `X` is the number to be run simultaneously.

If any changes are made to the template, or other issues are being encountered, try removing and regenerating the test apps by using `yarn test:cli:clean` before running the tests.

### Passing Jest or Playwright CLI flags (`--testPathPattern`, etc.)

`tests/scripts/run-tests.js` parses **runner-only** options (`-d` / `--domains`, `-c` / `--concurrency`, `-f` / `--setup`) with yargs, then spawns **Jest** (CLI tests) or **Playwright** (e2e). Any other flags (for example `--testPathPattern`, `--grep`) are forwarded to that underlying tool.

- With **Yarn**: `yarn test:cli -d strapi --testPathPattern=pull-remote` (or `push-remote`) works.
- With **npm**, you must pass arguments through npm:  
  `npm run test:cli -- -d strapi --testPathPattern=pull-remote`
- You can still use `--` so everything after it is forwarded as raw argv, e.g.  
  `yarn test:cli -d strapi -- --testPathPattern pull-remote`

### Environment variables

Jest is started from `tests/utils/runners/cli-runner.js` via **execa** with a **small** `env` object: only what the runner must inject (`TEST_APPS`, `JWT_SECRET`). Execa’s default **`extendEnv: true`** merges that object **on top of** the parent `process.env`.

So you do **not** need to whitelist variables in the runner. For **stress runs**, set `TRANSFER_CLI_MEDIA_COUNT` / `TRANSFER_CLI_MEDIA_BYTES` in the same shell as `yarn test:cli` so the seed scripts see them (defaults are tiny: 2 files × 2048 bytes).

The same merge behavior applies to **e2e**: `tests/utils/runners/browser-runner.js` only sets `PORT`, `HOST`, `TEST_APP_PATH`, and `STRAPI_DISABLE_EE`; the rest of the environment is inherited from how you invoked `yarn test:e2e`.

### Remote transfer e2e (pull and push, generated media)

The `strapi` domain reserves **two** test apps (`tests/cli/tests/strapi/config.js`) for:

| Suite | File                                    | Direction                 |
| ----- | --------------------------------------- | ------------------------- |
| Pull  | `data-transfer/pull-remote.test.cli.js` | Remote → local (`--from`) |
| Push  | `data-transfer/push-remote.test.cli.js` | Local → remote (`--to`)   |

Both run on every `yarn test:cli -d strapi` with **small** synthetic media (defaults: `TRANSFER_CLI_MEDIA_COUNT=2`, `TRANSFER_CLI_MEDIA_BYTES=2048`). No env flag is required to run them.

Assertions go beyond row counts: each suite compares **Strapi’s stored content `hash` plus `size`** for every seeded upload row between source and destination (see `tests/utils/cli-transfer-remote-e2e/upload-db.js`), so corrupted or truncated assets should fail even if the file count stayed right.

**Stress testing only** — raise total payload by exporting larger values for the same variables before invoking the CLI tests:

- `TRANSFER_CLI_MEDIA_COUNT` — number of synthetic files (default `2`)
- `TRANSFER_CLI_MEDIA_BYTES` — bytes per file (default `2048`)
- `CLI_TRANSFER_REMOTE_PORT` — remote Strapi port (default `13710`; legacy alias `CLI_TRANSFER_PULL_REMOTE_PORT`)

Other optional overrides: `CLI_TRANSFER_REMOTE_JEST_TIMEOUT_MS`, `CLI_TRANSFER_REMOTE_RUNNER_TIMEOUT_MS` (legacy `CLI_TRANSFER_PULL_*`).

This flow is **Jest / `yarn test:cli`**, not Playwright. The IDE Playwright runner does not execute these suites.

**Pull** (seed on **remote**), default small run:

```bash
yarn test:cli -d strapi --testPathPattern=pull-remote
```

**Push** (seed on **local**), default small run:

```bash
yarn test:cli -d strapi --testPathPattern=push-remote
```

Stress — larger library (10 × 512 KiB), **pull**:

```bash
TRANSFER_CLI_MEDIA_COUNT=10 TRANSFER_CLI_MEDIA_BYTES=524288 \
  yarn test:cli -d strapi --testPathPattern=pull-remote
```

Same sizes, **push**:

```bash
TRANSFER_CLI_MEDIA_COUNT=10 TRANSFER_CLI_MEDIA_BYTES=524288 \
  yarn test:cli -d strapi --testPathPattern=push-remote
```

Stress — ~2 GiB total (20 × 100 MiB; `104857600` = 100 × 1024² bytes):

```bash
TRANSFER_CLI_MEDIA_COUNT=20 TRANSFER_CLI_MEDIA_BYTES=104857600 \
  yarn test:cli -d strapi --testPathPattern=pull-remote
```

Large seeds need **plenty of free disk** under `test-apps/cli`. The **strapi** CLI domain uses a **30 minute** outer Jest budget by default (pull + push are heavy); it grows automatically when `TRANSFER_CLI_MEDIA_BYTES × TRANSFER_CLI_MEDIA_COUNT` exceeds 10 MiB or 100 MiB (up to **4 hours**). Other CLI domains keep a **2 minute** outer budget.

Implementation for these tests lives in **`tests/utils/cli-transfer-remote-e2e/`** (single package: seeding, SQLite checks, HTTP wait, timeouts). The **`tests/utils/seed-cli-transfer-media.js`** file is only a thin CLI entry that forwards to that package.

## Writing tests

The [coffee](https://github.com/node-modules/coffee) library is used to run commands and expect input, complete prompts, etc. Please see their documentation for more details.

Warning: Due to issues with the monorepo in regards to linking packages, we currently have to use 'npm' instead of 'yarn' to run internal CLI commands

### Accessing test app information

When a test domain is run, the path to the available test app is provided in the comma-separated env variable TEST_APPS. The number of apps provided will be the number of testApps set in the configuration, or the default of 1.

For example, if 2 test apps are requested, you should receive an env such as: `TEST_APPS=/test-apps/cli/test-app-0,/test-apps/cli/test-app-3`

Your CLI commands being tested can then be run in that directory.

#### Keeping an app running

As the CLI generally does not require a running Strapi app, this is not managed by the CLI testing tool.

For remote pull/push transfer, the suites under `data-transfer/pull-remote.test.cli.js` and `push-remote.test.cli.js` start a Strapi process in the background on a fixed port; see **Remote transfer e2e** above.

### Structure

Each subdirectory within the `./tests` directory here is considered a test "domain" and will have its own test app(s) available. By default only one test app is made available unless additional ones are configured in a config.js within that test domain.

Some domains need no shared test app (e.g. **`create-strapi-app`** uses `testApps: 0` in `config.js`). Those domains can run in parallel with app-backed domains; the runner reserves apps only when `testApps > 0`. Others put tests in **subfolders** under the domain—e.g. `strapi/strapi/`, `strapi/data-transfer/`, `strapi/version/`. Use the `*.test.cli.js` / `*.test.cli.ts` naming from `jest.config.cli.js` at the repo root.

#### tests/{domain}/config.js

This optional file should return a function that returns a configuration object like the following complete example:

```typescript
module.exports = () => {
  return {
    testApps: 2, // the number of test apps to be made available
  };
};
```

### How to run and test CLI commands

See the available tests in the `tests` directory for examples.

### Updating Jest snapshots

Some CLI tests (for example `strapi/strapi/openapi-generate.test.cli.ts`) commit **Jest snapshot** files. After intentional changes to the app template, generator output, or CLI output, regenerate snapshots with Jest’s `-u` instead of editing `.snap` files by hand.

- **From the repo root:** `yarn test:cli:update` runs the CLI test runner with `-u` forwarded to Jest (same as `yarn test:cli -u`). Limit domains or add extra Jest flags when needed, for example `yarn test:cli -d strapi -u -- --testPathPattern=openapi-generate`.
- **Direct Jest** (single file or when you only want to refresh snapshots without touching every domain): see **[tests/strapi/strapi/README.md](tests/strapi/strapi/README.md)** — you must set `TEST_APPS` and `JWT_SECRET` like the runner does.

See **[tests/strapi/strapi/README.md](tests/strapi/strapi/README.md)** for how snapshots work in the `strapi` domain (including OpenAPI and list-output tests) and when to run `yarn test:cli:clean` / `yarn test:cli --setup`.
