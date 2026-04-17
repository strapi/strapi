# End-to-End Playwright Tests

## Overview

E2E tests use Playwright to test Strapi's browser-based functionality. They share the same infrastructure as CLI tests:

- **Shared app template**: Both test types use `tests/app-template` to generate test applications
- **Shared utilities**: Common test utilities are in `tests/utils/`
- **Shared runners**: Test app setup and management is handled by `tests/utils/runners/shared-setup.js`
- **Unified test runner**: Both use `tests/scripts/run-tests.js` with different execution strategies

The main difference is that e2e tests use Playwright for browser automation, while CLI tests use Jest for command-line testing.

### Enterprise (EE) — where to put `STRAPI_LICENSE`

Create **`tests/e2e/.env`** relative to the monorepo root (copy **`tests/e2e/.env.example`**). Set **`STRAPI_LICENSE`** there for local EE runs. The runner loads **only** this file for e2e — **not** `.env` at the repo root.

Authoritative documentation: [`docs/docs/guides/e2e/00-setup.md`](../../docs/docs/guides/e2e/00-setup.md) (command-line options, env vars, CE vs EE).

## Running the tests

| Command            | Use when                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn test:e2e`    | Default: **auto** — EE in the runner if `STRAPI_LICENSE` is set (e.g. in `tests/e2e/.env`), otherwise CE. (Clears a stray `STRAPI_E2E_EDITION` from your shell for this run.) |
| `yarn test:e2e:ce` | Always **Community Edition**; `STRAPI_LICENSE` is removed from the runner env so Strapi cannot start as EE.                                                                   |
| `yarn test:e2e:ee` | **Exits with an error** if `STRAPI_LICENSE` is missing; otherwise **Enterprise** runner mode (Strapi still needs a valid license to boot as EE).                              |

The command generates test applications from the shared app template under `test-apps/e2e/` and runs Playwright per **domain** (top-level folder under `tests/e2e/tests/`).

**Concurrency (`-c` / `--concurrency`):** caps how many Strapi test apps run at once (`test-apps/e2e/test-app-0`, …). Defaults to the number of domain folders on disk. Domains are executed in **batches** of that size (parallel inside a batch, sequential across batches). Use `-c 1` if you need strictly serial domain runs or simpler logs.

**Runner vs Playwright args:** options for `tests/scripts/run-tests.js` (`--domains`, `-c`, `-f`, …) go **before** a `--`; everything after `--` is passed to `yarn playwright test` (e.g. a spec path, `--project=chromium`, `--reporter=line`). Use `--reporter=line` in CI or automation so the process exits cleanly (the default HTML reporter can block unattended runs).

If you change the template or the generated apps get into a bad state, remove and regenerate them with `yarn test:e2e:clean` before running again.

## Additional documentation

See contributor docs in [`docs/docs/guides/e2e/`](../../docs/docs/guides/e2e/) (setup, app template, data transfer, writing tests). Optional backlog: [`docs/docs/guides/e2e/FOLLOW_UP.md`](../../docs/docs/guides/e2e/FOLLOW_UP.md).
