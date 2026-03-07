# Agent quick reference

**Strapi monorepo** — source for packages users install via `create-strapi-app` / `yarn create strapi-app`. **Node**: >=20 <=24. **Yarn 4** only (from root); don’t use npm in workspaces.

- **Examples**: `/examples` — manual testing (`yarn develop` in example dir).
- **User docs**: https://docs.strapi.io
- **Contributor docs**: `/docs` — update when changing behavior or adding features.

## Repo layout (where to look)

- **Core**: `packages/core/*` — strapi, admin, content-type-builder, database, upload, data-transfer, etc.
- **Plugins**: `packages/plugins/*` — users-permissions, graphql, i18n, cloud, …
- **Utils / CLI**: `packages/utils/*`, `packages/cli/*`, `packages/generators/*`
- **Source vs output**: Code in `src/`; build output in `dist/`. **Edit only `src/`**, never `dist/`.
- **Commands**: Run from **repo root** (yarn build, yarn test:\*, yarn lint). Single package: `nx run <project>:build` or `nx run <project>:test:unit`.
- **Incremental build**: `yarn watch` — rebuilds only changed packages.

## Tests

| Suite     | Command                 | Scope                                                               |
| --------- | ----------------------- | ------------------------------------------------------------------- |
| Unit      | `yarn test:unit`        | Jest, packages, mocked deps                                         |
| Front-end | `yarn test:front`       | Jest, admin UI, `jest.config.front.js`                              |
| API       | `yarn test:api`         | Real app `test-apps/api`, HTTP; `--generate-app` to regenerate      |
| CLI       | `yarn test:cli`         | CLI commands, template + yalc-linked packages                       |
| E2E       | `yarn test:e2e`         | Playwright, real browser, spawned apps                              |
| Vitest    | `yarn test:unit:vitest` | Unit-style; **prefer for new tests** (`.vitest.test.ts`, see below) |

**Test file locations**: Unit → `packages/**/__tests__/*.test.{js,ts}` or `*.vitest.test.ts`. API → `tests/api/**/*.test.api.{js,ts}`. E2E → `tests/e2e/tests/<domain>/*.spec.ts`. CLI → `tests/cli/tests/<domain>/*.test.cli.{js,ts}`. Front → `packages/**/tests/**/*.test.[jt]sx`. Wrong path/suffix = test not picked up.

Strange failures: try `yarn build && yarn test:clean`.

### Run a subset

**E2E / CLI** (same runner): options **before** `--`, Playwright/Jest args **after** `--`. Single test: `--grep "title"` or `test.only()` / `it.only()`.

```bash
yarn test:e2e -d content-manager -- --project=chromium edit-view/collection-type-edit-view.spec.ts
yarn test:cli -d strapi -- strapi/middlewares-list.test.cli.js
```

**Jest** (unit, front, API): pass path and/or `-t "pattern"`.

```bash
yarn test:unit packages/core/core/src/utils/__tests__/some.test.ts
yarn test:unit -t "transformContentTypes"
yarn test:api tests/api/core/admin/admin-user.test.api.js
```

**Vitest**: path optional (matches `**/*.vitest.test.ts`).

```bash
yarn test:unit:vitest
yarn test:unit:vitest packages/core/core/src/utils/__tests__/file.vitest.test.ts
```

### Vitest (new tests)

Migrating unit tests from Jest to Vitest. **New test files**: use Vitest — suffix `.vitest.test.ts`, `import { describe, it, expect, vi } from 'vitest'`. Don’t convert existing Jest tests unless you’re in that file.

### Build before tests?

- **No build**: unit, front, Vitest (Jest/Vitest compile TS on the fly). API test _files_ can be `.ts` — Jest compiles them; build is not for the test files.
- **Build required**: API, CLI, E2E — the _runtime_ is monorepo packages from `dist/` (API tests load Strapi via require; CLI/E2E use yalc). After editing `packages/*`: `yarn build` then run the relevant suite.

## Build

- `yarn build` — full monorepo (Nx `build:code` + `build:types`).
- `yarn build:ts` — TS only. `yarn test:generate-app` = build:ts + generate test app.

## Test-driven workflow

- **Bug**: add test that reproduces it → fix → test passes = done + regression covered.
- **Feature**: tests for happy path, errors, edge cases; positive and negative.

## No breaking changes for Strapi users

**Do not make changes that would break existing Strapi users** (public APIs, config, CLI, plugin APIs, or documented behavior). If the user asks for a change that would be breaking (e.g. removing or renaming an API, changing config shape, changing default or existing behavior), **warn them** that it would be a breaking change and **suggest non-breaking alternatives** (e.g. add a new API alongside the old one, deprecate with a clear path, add an opt-in flag, preserve backward compatibility).

## Change complete checklist

1. `yarn build` passes.
2. `yarn lint` (or `yarn lint:fix`) passes.
3. Relevant test suite(s) pass (unit / front / API / CLI / E2E).
4. Update `/docs` if behavior or features changed.
