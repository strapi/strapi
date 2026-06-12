# End-to-End Playwright Tests

Playwright specs live under **`tests/e2e/tests/`** (each top-level folder is a **domain**). E2E shares app generation and the unified runner (`tests/scripts/run-tests.js`) with CLI tests.

**Do not duplicate setup here.** Use the contributor documentation:

| Guide                                                           | Contents                                                                                                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Setup](../../docs/docs/guides/e2e/00-setup.md)                 | Playwright install, `tests/e2e/.env` / `STRAPI_LICENSE`, `yarn test:e2e` / `:ce` / `:ee`, domains, concurrency, runner vs Playwright args, env vars, cleaning test apps |
| [App template](../../docs/docs/guides/e2e/01-app-template.md)   | How the shared `tests/app-template` feeds generated `test-apps/e2e/`                                                                                                    |
| [Data transfer](../../docs/docs/guides/e2e/02-data-transfer.md) | DTS-related e2e workflows                                                                                                                                               |

For scripted or agent-driven runs from the repo root, see **[AGENTS.md](../../AGENTS.md)**.

The main difference is that e2e tests use Playwright for browser automation, while CLI tests use Jest for command-line testing.

## Running the tests

Run `yarn test:e2e` to begin. The command will generate test applications from the shared app-template and run Playwright tests.

The `-c X` option can be used to limit the number of concurrent test apps, where `X` is the number to be run simultaneously.

If any changes are made to the template, or other issues are being encountered, try removing and regenerating the test apps by using `yarn test:e2e:clean` before running the tests.

Options meant for Playwright (for example `--grep`) are forwarded by the unified runner after the runner-only flags (`-d`, `-c`, `-f`). With **npm**, pass them after `--`: `npm run test:e2e -- -d settings --grep "My test"`. See `tests/cli/README.md` for the same pattern on CLI/Jest.

### Environment variables

Playwright is spawned from `tests/utils/runners/browser-runner.js` with a **small** `env` override (`PORT`, `HOST`, `TEST_APP_PATH`, `STRAPI_DISABLE_EE`). **execa** merges that with the parent environment by default, so other variables you export before `yarn test:e2e` still reach Playwright and the app under test. Details and the parallel Jest behaviour are in `tests/cli/README.md` → **Environment variables**.

## Additional Documentation

See contributor docs in `docs/docs/guides/e2e` for more detailed information about writing and maintaining e2e tests.
