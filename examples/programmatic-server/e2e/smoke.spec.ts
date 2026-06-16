import { test, expect } from '@playwright/test';

/**
 * Browser-level smoke test for the programmatic ("Strapi as a primitive") host.
 *
 * The server is booted by Playwright's `webServer` (see `playwright.config.ts`)
 * straight from `index.cjs` — i.e. `defineApp(...)` + `startStrapi(...)`. These
 * tests prove the headless programmatic server serves real HTTP in a real
 * browser:
 *   - a public custom HTML route renders,
 *   - a public custom JSON route responds,
 *   - auto-CRUD routes are mounted and secure by default.
 */
test('renders the programmatic server page in a real browser', async ({ page }) => {
  const response = await page.goto('/api/hello');

  expect(response?.ok(), 'GET /api/hello should respond 2xx').toBeTruthy();

  await expect(page).toHaveTitle('Strapi as a primitive');
  await expect(page.locator('#heading')).toHaveText('Strapi as a primitive');
  await expect(page.locator('#status')).toHaveText('The programmatic server is running.');
});

test('serves the public JSON echo route', async ({ request }) => {
  const response = await request.post('/api/echo', { data: { ping: 'pong' } });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ youSent: { ping: 'pong' } });
});

test('mounts auto-CRUD routes and secures them by default', async ({ request }) => {
  // The `article` content type generates REST CRUD at /api/articles. Without a
  // permission grant or API token, it must be auth-gated (401) — the route is
  // mounted (not 404) and secure by default, exactly like a file-based app.
  const response = await request.get('/api/articles');

  expect(response.status()).toBe(401);
});
