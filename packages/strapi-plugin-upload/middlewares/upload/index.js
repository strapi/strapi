'use strict';

const { join } = require('path');
const range = require('koa-range');
const koaStatic = require('koa-static');

const fetch = require('node-fetch');
const isValidDomain = require('is-valid-domain');

module.exports = strapi => ({
  initialize() {
    const staticDir = join(
      strapi.dir,
      strapi.config.middleware.settings.public.path || strapi.config.paths.static
    );

    strapi.app.on('error', err => {
      if (err.code === 'EPIPE') {
        // when serving audio or video the browsers sometimes close the connection to go to range requests instead.
        // This causes koa to emit a write EPIPE error. We can ignore it.
        // Right now this ignores it globally and we cannot do much more because it is how koa handles it.
        return;
      }

      strapi.app.onerror(err);
    });

    strapi.router.get('/uploads/(.*)', range, koaStatic(staticDir, { defer: true }));

    strapi.router.get('/upload/proxy', async ctx => {
      try {
        const url = new URL(ctx.query.url);

        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid URL');
        }

        if (!isValidDomain(url.hostname)) {
          throw new Error('Invalid URL');
        }
      } catch (err) {
        ctx.status = 400;
        ctx.body = 'Invalid URL';
        return;
      }

      try {
        const res = await fetch(ctx.query.url);

        if (res.ok) {
          Object.entries(res.headers.raw()).forEach(([key, value]) => {
            ctx.set(key, value);
          });
          ctx.body = res.body;
        } else {
          ctx.status = 400;
          ctx.body = 'Invalid URL';
        }
      } catch (err) {
        strapi.log.error(err);
        ctx.status = 500;
        ctx.body = 'Internal Server Error';
      }
    });
  },
});
