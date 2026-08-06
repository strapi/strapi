/**
 * Embed Strapi alongside a Next.js app via a custom server (Express).
 *
 * Strapi is mounted at `/strapi`; all other requests are handled by Next.js.
 * Run with `yarn start:next` from this directory (after `yarn install`).
 */
const path = require('node:path');
const express = require('express');
const next = require('next');
const { loadStrapi } = require('@strapi/strapi');
const appDefinition = require('./app.cjs');

const STRAPI_MOUNT = '/strapi';
const NEXT_DIR = path.join(__dirname, 'next');
const PORT = Number(process.env.PORT) || 3102;
const dev = process.env.NODE_ENV !== 'production';

const main = async () => {
  const nextApp = next({ dev, dir: NEXT_DIR });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  const strapi = await loadStrapi(appDefinition, { serveAdminPanel: false });
  const server = express();

  server.use(STRAPI_MOUNT, strapi.server.app.callback());
  server.all('*', (req, res) => handle(req, res));

  const httpServer = server.listen(PORT, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`Next + Strapi host listening on http://127.0.0.1:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Next home:  http://127.0.0.1:${PORT}/`);
    // eslint-disable-next-line no-console
    console.log(
      `Strapi API: curl -X POST http://127.0.0.1:${PORT}${STRAPI_MOUNT}/api/echo -H 'Content-Type: application/json' -d '{"ping":"pong"}'`
    );
  });

  const shutdown = async () => {
    httpServer.close();
    await strapi.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
