import type { Plugin, UserConfig } from 'vite';

/**
 * Testing lazy admin chunks (delay / synthetic failure)
 * -----------------------------------------------------
 * In dev, this plugin can slow down or fail specific JavaScript chunk responses so you can watch
 * LazyOutlet loading states and chunk retry behavior in the browser.
 *
 * Easiest way to try it
 * ---------------------
 * From this repo's `examples/complex` folder. The match string below is a leaf route (Settings
 * plugins list), not a layout shell such as `AuthenticatedLayout` or the settings `Layout` chunk:
 *
 *   STRAPI_ADMIN_TEST_CHUNK_MATCH=InstalledPlugins STRAPI_ADMIN_TEST_CHUNK_DELAY_MS=5000 yarn develop
 *
 * Log in to the admin, then open Settings → Plugins (sidebar). You should see a loading
 * spinner in the settings content column for a few seconds, then the Plugins screen. Nothing here matches until you visit that page,
 * so the rest of the admin works normally until you navigate there.
 *
 * Flaky chunks (retry path):
 *
 *   STRAPI_ADMIN_TEST_CHUNK_MATCH=InstalledPlugins STRAPI_ADMIN_TEST_CHUNK_FAIL_COUNT=2 yarn develop
 *
 * Same navigation: Settings → Plugins. The first requests for the matching chunk return 503; after
 * the failures are used up, the chunk loads.
 *
 * Stack failure then slow success (same navigation):
 *
 *   STRAPI_ADMIN_TEST_CHUNK_MATCH=InstalledPlugins STRAPI_ADMIN_TEST_CHUNK_FAIL_COUNT=2 STRAPI_ADMIN_TEST_CHUNK_DELAY_MS=2000 yarn develop
 *
 * Environment variables
 * ---------------------
 * - `STRAPI_ADMIN_TEST_CHUNK_DELAY_MS` — milliseconds to wait before serving a matching chunk (optional).
 * - `STRAPI_ADMIN_TEST_CHUNK_FAIL_COUNT` — number of matching requests that return 503 before
 *   normal serving (optional). Use 0 or unset to disable failures.
 * - `STRAPI_ADMIN_TEST_CHUNK_MATCH` — substring of the chunk request URL. Defaults to
 *   `InstalledPlugins` (lazy module for Settings → Plugins). Prefer a leaf screen like this, not a
 *   wrapper chunk (`AuthenticatedLayout`, settings `Layout`, etc.). Override if your Vite URLs differ.
 *
 * If nothing happens, open DevTools → Network, filter JS, trigger the navigation, and copy a short
 * substring from the failing chunk URL into `STRAPI_ADMIN_TEST_CHUNK_MATCH`.
 *
 * Picking a target: use a screen you open after the shell is up (e.g. Settings → Plugins). Avoid
 * using the home dashboard or huge shell chunks for slow delays; the main area stays blank until
 * those chunks finish, which looks broken even when it is working.
 *
 * Implementation: registered first so this middleware runs before Vite serves modules.
 */
const testChunkPlugin = (): Plugin => ({
  name: 'strapi-admin-test-chunk',
  apply: 'serve',
  configureServer(server) {
    const delayMs = Number(process.env.STRAPI_ADMIN_TEST_CHUNK_DELAY_MS || 0);
    const failCount = Number(process.env.STRAPI_ADMIN_TEST_CHUNK_FAIL_COUNT || 0);
    const match = process.env.STRAPI_ADMIN_TEST_CHUNK_MATCH || 'InstalledPlugins';

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
