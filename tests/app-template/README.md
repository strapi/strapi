# Shared Test App Template

This template application is shared by both **e2e** (Playwright) and **cli** (Jest) test suites. It provides a consistent base application with predefined content types, components, and configurations for testing.

## Usage

Both test types use this template when generating test applications:

- **E2E tests**: Generate apps from this template and run Playwright browser tests
- **CLI tests**: Generate apps from this template and run Jest command-line tests

The template is located at `tests/app-template` and is automatically used by the unified test runner (`tests/scripts/run-tests.js`).

## Updating the Template

If you make changes to this template:

1. Run `yarn test:e2e:clean` or `yarn test:cli:clean` to remove existing test apps
2. Regenerate test apps with `yarn test:e2e` or `yarn test:cli` (or use `--setup` flag to force regeneration)

Changes to the template will affect both e2e and cli test suites, ensuring consistency across test types.
