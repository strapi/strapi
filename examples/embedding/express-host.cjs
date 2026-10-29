/**
 * Embed Strapi in an existing Express host.
 *
 * Strapi is mounted at `/strapi` — Express strips the prefix before handing the
 * request to `strapi.server.app.callback()`, so `POST /strapi/api/echo` hits
 * Strapi's `POST /api/echo`.
 */
const express = require('express');
const { loadStrapi } = require('@strapi/strapi');
const appDefinition = require('./app.cjs');

const STRAPI_MOUNT = '/strapi';

/**
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @returns {import('express').Express}
 */
const createExpressHost = (strapi) => {
  const host = express();

  host.get('/health', (_req, res) => {
    res.json({ ok: true, host: 'express' });
  });

  host.use(STRAPI_MOUNT, strapi.server.app.callback());

  host.use((_req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  return host;
};

/**
 * Boot the Express host on `port` (0 = ephemeral). Returns `{ host, server, strapi }`.
 *
 * @param {{ port?: number, strapi?: import('@strapi/types').Core.Strapi }} [options]
 */
const startExpressHost = async (options = {}) => {
  const strapi = options.strapi ?? (await loadStrapi(appDefinition, { serveAdminPanel: false }));
  const host = createExpressHost(strapi);
  const port = options.port ?? 0;

  const server = await new Promise((resolve) => {
    const listening = host.listen(port, '127.0.0.1', () => resolve(listening));
  });

  return { host, server, strapi, mountPath: STRAPI_MOUNT };
};

module.exports = { createExpressHost, startExpressHost, STRAPI_MOUNT };

if (require.main === module) {
  startExpressHost({ port: Number(process.env.PORT) || 3101 })
    .then(({ server, mountPath }) => {
      const { port } = server.address();
      // eslint-disable-next-line no-console
      console.log(`Express host listening on http://127.0.0.1:${port}`);
      // eslint-disable-next-line no-console
      console.log(`Try: curl http://127.0.0.1:${port}/health`);
      // eslint-disable-next-line no-console
      console.log(
        `Try: curl -X POST http://127.0.0.1:${port}${mountPath}/api/echo -H 'Content-Type: application/json' -d '{"ping":"pong"}'`
      );
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      process.exit(1);
    });
}
