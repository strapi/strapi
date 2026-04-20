# End-to-End Playwright Tests

Playwright specs live under **`tests/e2e/tests/`** (each top-level folder is a **domain**). E2E shares app generation and the unified runner (`tests/scripts/run-tests.js`) with CLI tests.

**Do not duplicate setup here.** Use the contributor documentation:

| Guide                                                           | Contents                                                                                                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Setup](../../docs/docs/guides/e2e/00-setup.md)                 | Playwright install, `tests/e2e/.env` / `STRAPI_LICENSE`, `yarn test:e2e` / `:ce` / `:ee`, domains, concurrency, runner vs Playwright args, env vars, cleaning test apps |
| [App template](../../docs/docs/guides/e2e/01-app-template.md)   | How the shared `tests/app-template` feeds generated `test-apps/e2e/`                                                                                                    |
| [Data transfer](../../docs/docs/guides/e2e/02-data-transfer.md) | DTS-related e2e workflows                                                                                                                                               |

For scripted or agent-driven runs from the repo root, see **[AGENTS.md](../../AGENTS.md)**.
