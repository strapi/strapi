/**
 * The programmatic Strapi app definition.
 *
 * A single file that *defines* a Strapi app with no `config/**`, no
 * `src/api/**`, and no `package.json` plugin scan — the programmatic definition
 * is the single source of truth. It is imported by:
 *
 *   - `index.ts`        — starts the server (`startStrapi`),
 *   - `build-admin.ts`  — builds the admin panel (`buildAdmin`).
 *
 * Authored in TypeScript and compiled to CommonJS (`tsc` → `dist/`). Programmatic
 * apps run under CommonJS in Phase 1 (the published `.mjs` bundles use bare
 * directory imports Node's strict ESM resolver rejects). The HTTP port can be
 * overridden with `PORT` / `HOST` (used by the Playwright smoke test).
 */
import { defineApp, defineConfig } from '@strapi/strapi';
import * as is from '@strapi/strapi/attributes';
import { recommendedPlugins } from '@strapi/strapi/plugins';

const PORT = Number(process.env.PORT) || 1337;
const HOST = process.env.HOST || '127.0.0.1';

const app = defineApp({
  config: defineConfig({
    database: {
      connection: { client: 'sqlite', connection: { filename: '.tmp/data.db' } },
    },
    server: {
      host: HOST,
      port: PORT,
      app: { keys: ['exampleKeyA', 'exampleKeyB'] },
    },
    // The admin server always loads (even headless), so its secrets are
    // required. In a real app, read these from environment variables.
    admin: {
      apiToken: { salt: 'exampleApiTokenSalt' },
      auth: { secret: 'exampleAuthSecret' },
      transfer: { token: { salt: 'exampleTransferSalt' } },
    },
  }),

  // Imported and added explicitly — nothing is scanned. `email` is required by
  // the always-on admin server; `i18n` is required for auto-CRUD routing. Each
  // entry carries a `resolve` hint so `buildAdmin` can bundle its frontend.
  plugins: recommendedPlugins(),

  contentTypes: [
    {
      singularName: 'article',
      pluralName: 'articles',
      displayName: 'Article',
      attributes: {
        title: is.string({ required: true }),
        content: is.text(),
      },
      // api defaults to `true` -> REST CRUD auto-generated at /api/articles.
      // In the admin panel, this content type is **read-only** in the
      // Content-Type Builder (it is defined in code, not on disk).
    },
  ],

  // Inline custom routes are content-api routes (served under `/api`) and are
  // public by default. `GET /api/hello` returns a tiny HTML page so a real
  // browser has something to render; `POST /api/echo` returns JSON.
  routes: ({ get, post }) => [
    get('/hello', (ctx) => {
      ctx.type = 'html';
      ctx.body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Programmatic Strapi</title>
  </head>
  <body>
    <main>
      <h1 id="heading">Programmatic Strapi</h1>
      <p id="status">The programmatic server is running.</p>
    </main>
  </body>
</html>`;
    }),
    post('/echo', (ctx) => ({ youSent: ctx.request.body })),
  ],

  bootstrap({ strapi }) {
    strapi.log.info('Hello from the programmatic bootstrap function!');
  },
});

export default app;
