'use strict';

const { resolve } = require('path');
const range = require('koa-range');
const koaStatic = require('koa-static');

module.exports = {
  defaults: { upload: { enabled: true } },
  load: {
    initialize() {
      const configPublicPath = strapi.config.get(
        'middleware.settings.public.path',
        strapi.config.paths.static
      );
      const staticDir = resolve(strapi.dir, configPublicPath);

      strapi.server.app.on('error', err => {
        if (err.code === 'EPIPE') {
          // when serving audio or video the browsers sometimes close the connection to go to range requests instead.
          // This causes koa to emit a write EPIPE error. We can ignore it.
          // Right now this ignores it globally and we cannot do much more because it is how koa handles it.
          return;
        }

        strapi.server.app.onerror(err);
      });

      const localServerConfig = strapi.config.get('plugin.upload.providerOptions.localeServer', {});

      strapi.server.routes([
        {
          method: 'GET',
          path: '/uploads/(.*)',
          handler: [range, koaStatic(staticDir, { defer: true, ...localServerConfig })],
          config: { auth: false },
        },
      ]);
    },
  },
};
