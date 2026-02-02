# End-to-End Playwright Tests

## Overview

E2E tests use Playwright to test Strapi's browser-based functionality. They share the same infrastructure as CLI tests:

- **Shared app template**: Both test types use `tests/app-template` to generate test applications
- **Shared utilities**: Common test utilities are in `tests/utils/`
- **Shared runners**: Test app setup and management is handled by `tests/utils/runners/shared-setup.js`
- **Unified test runner**: Both use `tests/scripts/run-tests.js` with different execution strategies

The main difference is that e2e tests use Playwright for browser automation, while CLI tests use Jest for command-line testing.

## Running the tests

Run `yarn test:e2e` to begin. The command will generate test applications from the shared app-template and run Playwright tests.

The `-c X` option can be used to limit the number of concurrent test apps, where `X` is the number to be run simultaneously.

If any changes are made to the template, or other issues are being encountered, try removing and regenerating the test apps by using `yarn test:e2e:clean` before running the tests.

## Additional Documentation

See contributor docs in `docs/docs/guides/e2e` for more detailed information about writing and maintaining e2e tests.
