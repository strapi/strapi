/**
 * Playwright's web-first `expect` (auto-retrying matchers like `toHaveTitle`, `toBeVisible`,
 * `toBeFocused`) is a standalone assertion library — it does not depend on the Playwright test
 * runner — so we can use it inside Vitest. Import `expect` from here in `*.vitest.spec.ts` files;
 * it shadows Vitest's global `expect` only within that module.
 */
export { expect } from '@playwright/test';
