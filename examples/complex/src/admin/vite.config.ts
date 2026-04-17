import type { Plugin, UserConfig } from 'vite';

/**
 * Dev-only helpers to exercise admin dynamic-import behavior (Suspense + retry).
 *
 * Usage from `examples/complex` (after `yarn dev` / `strapi develop`):
 *
 * 1) Slow chunk (Suspense stays on loading ~10s, then the page loads)
 *    STRAPI_ADMIN_TEST_CHUNK_DELAY_MS=10000 yarn dev
 *
 * 2) Flaky chunk (first N matching requests return 503 → triggers retry, then succeeds)
 *    STRAPI_ADMIN_TEST_CHUNK_FAIL_COUNT=2 STRAPI_ADMIN_TEST_CHUNK_MATCH=HomePage yarn dev
 *
 * 3) Combine both (fail twice, then a slow success)
 *    STRAPI_ADMIN_TEST_CHUNK_FAIL_COUNT=2 STRAPI_ADMIN_TEST_CHUNK_DELAY_MS=3000 yarn dev
 *
 * `STRAPI_ADMIN_TEST_CHUNK_MATCH` is a substring of the dev request URL (default `HomePage`).
 * Use DevTools → Network to see exact URLs if a match fails.
 *
 * Example: delay only the Content Manager shell (admin layout + home load; CM chunk waits):
 *   STRAPI_ADMIN_TEST_CHUNK_DELAY_MS=10000 STRAPI_ADMIN_TEST_CHUNK_MATCH=content-manager yarn develop
 * Then open Content Manager from the sidebar after login.
 *
 * This plugin is registered first so its middleware runs before Vite serves the module.
 */
const testChunkPlugin = (): Plugin => ({
  name: 'strapi-admin-test-chunk',
  apply: 'serve',
  configureServer(server) {
    const delayMs = Number(process.env.STRAPI_ADMIN_TEST_CHUNK_DELAY_MS || 0);
    const failCount = Number(process.env.STRAPI_ADMIN_TEST_CHUNK_FAIL_COUNT || 0);
    const match = process.env.STRAPI_ADMIN_TEST_CHUNK_MATCH || 'HomePage';

    if (!delayMs && !failCount) {
      return;
    }

    let failuresRemaining = failCount;

    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';

      if (!url.includes(match)) {
        next();
        return;
      }

      if (failuresRemaining > 0) {
        failuresRemaining -= 1;
        res.statusCode = 503;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Synthetic 503 for Strapi admin chunk retry test');
        return;
      }

      if (delayMs > 0) {
        setTimeout(() => next(), delayMs);
        return;
      }

      next();
    });
  },
});

export default (config: UserConfig): UserConfig => ({
  ...config,
  plugins: [testChunkPlugin(), ...(config.plugins ?? [])],
});
