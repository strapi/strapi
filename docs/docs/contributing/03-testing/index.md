---
title: Testing
description: The test types of the Strapi monorepo (unit, front-end, TypeScript, API integration, CLI and E2E) and the command that runs each one.
status: draft
review_notes:
  - Summarized from AGENTS.md; add per-suite conventions.
---

This page lists the test types of the monorepo and the command that runs each one. Run the commands at the repo root.

## Unit tests

Unit test files live in `__tests__/` folders inside each package. Run them first, because they are the fastest.

```bash
yarn test:unit
yarn test:unit:watch
yarn test:unit:update   # update snapshots
```

## Front-end tests

Front-end tests cover the admin panel. Their files also live in `__tests__/` folders inside each package.

```bash
yarn test:front              # IS_EE=true: Enterprise Edition features enabled
yarn test:front:ce           # IS_EE=false: Community Edition only
yarn test:front:update       # update snapshots (EE)
yarn test:front:update:ce    # update snapshots (CE)
```

## Type checking

```bash
yarn test:ts   # all packages, front-end and back-end
```

## API integration tests

The integration tests live in `tests/api/`. They need a generated Strapi test app. Always regenerate the app with `yarn test:generate-app` instead of reusing an old one. An old app causes misleading failures.

```bash
yarn test:api                 # SQLite
yarn test:api --db=postgres
yarn test:api --db=mysql
yarn test:api -u              # update snapshots
```

[CONTRIBUTING.md](https://github.com/strapi/strapi/blob/develop/CONTRIBUTING.md) describes how to generate the app for each database and how to run the suite for the Enterprise Edition with `STRAPI_LICENSE`.

## CLI tests

The CLI tests live in `tests/cli/`. They use Jest. They share the app template, the utilities and the runner (`tests/scripts/run-tests.js`) with the E2E tests.

```bash
yarn test:cli
yarn test:cli:debug    # with debug output
yarn test:cli:update   # update snapshots
```

## E2E tests

The E2E tests use Playwright. The specs live in `tests/e2e/tests/`, in one folder per domain, such as `admin`, `content-manager` and `i18n`.

```bash
yarn playwright install                          # one-time browser install
yarn test:e2e --setup --concurrency=1            # run all domains one after the other
yarn test:e2e --domains content-manager admin    # run some domains
yarn test:e2e --concurrency=3                    # run three domains in parallel
```

If you change the app template or hit setup problems, run `yarn test:e2e:clean` to remove the generated test apps before the next run.

Read these pages before you write or change an E2E test:

- [E2E setup](./e2e/00-setup.md): Playwright install, Enterprise Edition runs, runner options and environment variables.
- [E2E app template](./e2e/01-app-template.md): how the shared app template feeds the generated test apps.
- [E2E data transfer](./e2e/02-data-transfer.md): the data transfer workflows that the tests rely on.

## Before you open a pull request

Run at least:

```bash
yarn test:unit && yarn test:front && yarn test:ts && yarn lint && yarn prettier:check
```

CI also runs the E2E tests on every pull request. They are slow. Use `--domains` to run only some domains locally.
