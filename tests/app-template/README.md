# Shared Test App Template

This template application is used by the **e2e** (Playwright) test suite. It provides a consistent base application with predefined content types, components, and configurations for testing.

## Usage

The e2e tests generate apps from this template and run Playwright browser tests against them.

The template is located at `tests/app-template` and is automatically used by the unified test runner (`tests/scripts/run-tests.js`).

## Updating the Template

If you make changes to this template:

1. Run `yarn test:e2e:clean` to remove existing test apps
2. Regenerate test apps with `yarn test:e2e` (or use `--setup` flag to force regeneration)
