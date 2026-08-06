/**
 * Shared programmatic Strapi definition for the embedding recipes.
 *
 * Kept minimal: one public custom route (`POST /api/echo`) and no auto-CRUD so
 * only the `email` plugin is required (see `examples/single-file/README.md`).
 */
const { defineApp, defineConfig } = require('@strapi/strapi');
const is = require('@strapi/strapi/attributes');

const lazyEmail = () => {
  const mod = require('@strapi/email/strapi-server');
  const resolved = mod && mod.__esModule ? mod.default : (mod?.default ?? mod);
  return typeof resolved === 'function'
    ? resolved({ env: require('@strapi/utils').env })
    : resolved;
};

module.exports = defineApp({
  config: defineConfig({
    database: {
      connection: { client: 'sqlite', connection: { filename: '.tmp/data.db' } },
    },
    server: {
      host: process.env.HOST || '127.0.0.1',
      port: Number(process.env.PORT) || 0,
      app: { keys: ['embedKeyA', 'embedKeyB'] },
    },
    admin: {
      apiToken: { salt: 'embedApiTokenSalt' },
      auth: { secret: 'embedAuthSecret' },
      transfer: { token: { salt: 'embedTransferSalt' } },
      secrets: { encryptionKey: '0123456789abcdef0123456789abcdef' },
    },
    logger: { config: { level: 'warn' } },
  }),
  plugins: { email: lazyEmail() },
  contentTypes: [
    {
      singularName: 'note',
      pluralName: 'notes',
      displayName: 'Note',
      api: false,
      attributes: { body: is.text() },
    },
  ],
  routes: ({ post }) => [post('/echo', (ctx) => ({ youSent: ctx.request.body }))],
});
