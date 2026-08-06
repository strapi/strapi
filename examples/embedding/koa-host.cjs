/**
 * Embed Strapi in an existing Koa host.
 *
 * The host owns the HTTP port. Strapi is booted with `loadStrapi` (no `listen()`)
 * and its Koa app is invoked via `strapi.server.app.callback()` for matching paths.
 */
const http = require('node:http');
const Koa = require('koa');
const { loadStrapi } = require('@strapi/strapi');
const appDefinition = require('./app.cjs');

const STRAPI_PATH_PREFIXES = ['/api', '/admin', '/_health'];

const shouldDelegateToStrapi = (path) =>
  STRAPI_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

/**
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @returns {import('koa')}
 */
const createKoaHost = (strapi) => {
  const host = new Koa();
  const strapiHandler = strapi.server.app.callback();

  host.use(async (ctx, next) => {
    if (ctx.path === '/health') {
      ctx.body = { ok: true, host: 'koa' };
      return;
    }

    if (shouldDelegateToStrapi(ctx.path)) {
      ctx.respond = false;
      await new Promise((resolve, reject) => {
        strapiHandler(ctx.req, ctx.res, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      return;
    }

    await next();
  });

  host.use((ctx) => {
    ctx.status = 404;
    ctx.body = { error: 'not found' };
  });

  return host;
};

/**
 * Boot the Koa host on `port` (0 = ephemeral). Returns `{ host, server, strapi }`.
 *
 * @param {{ port?: number, strapi?: import('@strapi/types').Core.Strapi }} [options]
 */
const startKoaHost = async (options = {}) => {
  const strapi = options.strapi ?? (await loadStrapi(appDefinition, { serveAdminPanel: false }));
  const host = createKoaHost(strapi);
  const server = http.createServer(host.callback());
  const port = options.port ?? 0;

  await new Promise((resolve) => {
    server.listen(port, '127.0.0.1', resolve);
  });

  return { host, server, strapi };
};

module.exports = { createKoaHost, startKoaHost, shouldDelegateToStrapi };

if (require.main === module) {
  startKoaHost({ port: Number(process.env.PORT) || 3100 })
    .then(({ server }) => {
      const { port } = server.address();
      // eslint-disable-next-line no-console
      console.log(`Koa host listening on http://127.0.0.1:${port}`);
      // eslint-disable-next-line no-console
      console.log(`Try: curl http://127.0.0.1:${port}/health`);
      // eslint-disable-next-line no-console
      console.log(
        `Try: curl -X POST http://127.0.0.1:${port}/api/echo -H 'Content-Type: application/json' -d '{"ping":"pong"}'`
      );
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      process.exit(1);
    });
}
