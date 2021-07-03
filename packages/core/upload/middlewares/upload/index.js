'use strict';

const { resolve } = require('path');
const range = require('koa-range');
const koaStatic = require('koa-static');
const _ = require('lodash');

module.exports = strapi => ({
  initialize() {
    const configPublicPath = strapi.config.get(
      'middleware.settings.public.path',
      strapi.config.paths.static
    );
    const staticDir = resolve(strapi.dir, configPublicPath);

    strapi.app.on('error', err => {
      if (err.code === 'EPIPE') {
        // when serving audio or video the browsers sometimes close the connection to go to range requests instead.
        // This causes koa to emit a write EPIPE error. We can ignore it.
        // Right now this ignores it globally and we cannot do much more because it is how koa handles it.
        return;
      }

      strapi.app.onerror(err);
    });

    const localServerConfig =
      _.get(strapi, 'plugins.upload.config.providerOptions.localServer') || {};
    strapi.router.get(
      '/uploads/(.*)',
      range,
      koaStatic(staticDir, { defer: true, ...localServerConfig })
    );
  },
});
