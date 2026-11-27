---
title: 'unit-test-utils'
sidebar_label: 'unit-test-utils'
description: 'Shared helpers and the Jest setup file for package unit tests'
package: 'unit-test-utils'
status: draft
review_notes:
  - Written when the helpers moved out of /tests (CMS-1942); needs a maintainer review.
---

## Purpose

Holds the helpers that package unit tests (`packages/**/__tests__`) share, so they do not import from the repository's `/tests` folder, which only holds the API, E2E and CLI suites. Internal tooling only; not published.

## Key concepts

- **`unit-test-utils/create-context`**: builds a minimal Koa-like `ctx` (`params`, `query`, `request.body`) for controller and strategy tests. Ships a `.d.ts`, so TypeScript tests import it without `@ts-expect-error`.
- **`unit-test-utils/create-session-manager-mock`**: `createMockSessionManager()`, a callable `SessionManager` mock built from `jest.fn()`. Jest only; Vitest tests keep a local `vi.fn()` version.
- **`jest-setup.js`**: the `setupFilesAfterEnv` file of the root `jest-preset.unit.js`. It turns `global.strapi` into an accessor that decorates any assigned object with `plugin()`, `api()` and `service('admin::…')` helpers. `packages/core/admin/vitest.setup.ts` is its Vitest port.
- **Dependencies**: a package that imports a helper lists `unit-test-utils` in its `devDependencies`. The preset references `jest-setup.js` by path.

## Related

- [vitest-config](../vitest-config/index.md): the shared Vitest unit preset.
- [Testing](../../../contributing/03-testing/index.md): unit test execution.
