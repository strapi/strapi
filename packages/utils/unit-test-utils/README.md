# unit-test-utils

Shared helpers for **package unit tests** in the Strapi monorepo (the Jest and Vitest tests in
`packages/**/__tests__`). Suites under `/tests` and `/tests-next` have their own helpers.

> [!IMPORTANT]
> This is a private package and is not intended to be used outside of the Strapi monorepo.

| Export                                        | What it is                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `unit-test-utils/create-context`              | Builds a minimal Koa-like `ctx` (`params`, `query`, `request.body`) for controller tests.                      |
| `unit-test-utils/create-session-manager-mock` | `createMockSessionManager()`: a callable `SessionManager` mock built from `jest.fn()` (Jest only).             |
| `unit-test-utils/jest-setup`                  | `setupFilesAfterEnv` file of the root `jest-preset.unit.js`: decorates any object assigned to `global.strapi`. |

Packages that import a helper list `unit-test-utils` in their `devDependencies`.
