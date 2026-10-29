/**
 * `startStrapi(app)` is the primary Phase 1 entry point. It defaults to
 * headless — it boots the HTTP API server with no admin panel build.
 */
const { startStrapi } = require('@strapi/strapi');

const app = require('./index.cjs');

startStrapi(app).catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
