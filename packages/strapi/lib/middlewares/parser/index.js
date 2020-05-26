'use strict';

const body = require('koa-body');
const qs = require('qs');

/**
 * Body parser hook
 */
const addQsParser = app => {
  Object.defineProperty(app.request, 'query', {
    configurable: false,
    enumerable: true,
    /*
     * Get parsed query-string.
     */
    get() {
      const qstr = this.querystring;
      const cache = (this._querycache = this._querycache || {});
      return cache[qstr] || (cache[qstr] = qs.parse(qstr));
    },

    /*
     * Set query-string as an object.
     */
    set(obj) {
      this.querystring = qs.stringify(obj);
    },
  });

  return app;
};

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */
    initialize() {
      strapi.app.use((ctx, next) => {
        // disable for graphql
        // TODO: find a better way later
        if (ctx.url === '/graphql') return next();

        return body({
          patchKoa: true,
          ...strapi.config.middleware.settings.parser,
        })(ctx, next);
      });

      addQsParser(strapi.app);
    },
  };
};
