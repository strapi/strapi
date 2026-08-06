/**
 * A complete headless Strapi app defined in code — no `config/**`, no
 * `src/api/**`, no `package.json` plugin scan. The programmatic definition is
 * the single source of truth.
 *
 * This is the runnable (CommonJS) form. The TypeScript authoring shape is shown
 * in the README; programmatic apps run under CommonJS today (see the ESM note
 * there).
 */
const { defineApp, defineConfig } = require('@strapi/strapi');
const is = require('@strapi/strapi/attributes');
const { recommendedPlugins } = require('@strapi/strapi/plugins');

module.exports = defineApp({
  // Config is passed in (typed + validated at startup). No config files required.
  config: defineConfig({
    database: {
      connection: { client: 'sqlite', connection: { filename: '.tmp/data.db' } },
    },
    server: {
      host: '127.0.0.1',
      port: 1337,
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

  // Plugins are imported and added explicitly — nothing is scanned. `email` is
  // required by the always-on admin server; `i18n` is required for auto-CRUD
  // route generation. `recommendedPlugins()` bundles the familiar set.
  plugins: recommendedPlugins(),

  contentTypes: [
    {
      // Explicit naming — no auto-pluralization. Both are required.
      singularName: 'article',
      pluralName: 'articles',
      displayName: 'Article',
      attributes: {
        title: is.string({ required: true }),
        content: is.text(),
      },
      // api defaults to `true` -> REST CRUD auto-generated at /api/articles.
      // Set `api: false` to opt out and only expose custom routes.
    },
  ],

  // Inline custom routes are content-api routes (served under `/api`) and are
  // public by default, so `POST /api/echo` works with no permission setup.
  routes: ({ post }) => [post('/echo', (ctx) => ({ youSent: ctx.request.body }))],

  bootstrap({ strapi }) {
    strapi.log.info('Hello from the bootstrap function!');
  },
});
