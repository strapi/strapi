/**
 * Strapi as a primitive — the smallest possible host.
 *
 * A single file that *defines* a Strapi app and *starts* it. No `config/**`, no
 * `src/api/**`, no `package.json` plugin scan — the programmatic definition is
 * the single source of truth.
 *
 * Run it with `yarn start` (which is just `node index.cjs`). The HTTP port can
 * be overridden with `PORT` / `HOST` (used by the Playwright smoke test).
 */
const { defineApp, defineConfig, startStrapi } = require('@strapi/strapi');
const is = require('@strapi/strapi/attributes');
const { recommendedPlugins } = require('@strapi/strapi/plugins');

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
  // the always-on admin server; `i18n` is required for auto-CRUD routing.
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
    <title>Strapi as a primitive</title>
  </head>
  <body>
    <main>
      <h1 id="heading">Strapi as a primitive</h1>
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

startStrapi(app).catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
