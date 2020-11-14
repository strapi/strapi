'use strict';

const _ = require('lodash');
const { resolve } = require('path');
const range = require('koa-range');
const koaStatic = require('koa-static');
const koaStaticCache = require('koa-static-cache');
const LRU = require('lru-cache');

module.exports = strapi => ({
  initialize() {
    const config = strapi.plugins.upload.config;
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

    if (config.provider == 'local' && config.providerOptions.enableCache) {
      const cacheOptions = _.get(config.providerOptions, 'cacheOptions', {});

      if (cacheOptions.dynamic) {
        const lruOptions = _.get(config.providerOptions, 'lruOptions', {});
        cacheOptions.files = new LRU(lruOptions);
      }

      strapi.router.get('/uploads/(.*)', range, koaStaticCache(staticDir, cacheOptions));
      return;
    }

    strapi.router.get('/uploads/(.*)', range, koaStatic(staticDir, { defer: true }));
  },
});
