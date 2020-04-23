'use strict';

const body = require('koa-body');
//const qs = require('koa-qs');
var merge = require('merge-descriptors');
const qs = require('qs');

/**
 * Body parser hook
 */

const addParser = app => {
  merge(app.request, {
    /**
     * Get parsed query-string.
     *
     * @return {Object}
     * @api public
     */
    get query() {
      var str = this.querystring;
      if (!str) return {};

      var c = (this._querycache = this._querycache || {});
      var query = c[str];
      if (!query) {
        c[str] = query = qs.parse(str);
      }
      return query;
    },

    /**
     * Set query-string as an object.
     *
     * @param {Object} obj
     * @api public
     */

    set query(obj) {
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

      addParser(strapi.app);
    },
  };
};
