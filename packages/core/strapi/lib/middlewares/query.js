'use strict';

const { defaultsDeep } = require('lodash/fp');
const qs = require('qs');

const defaults = {
  strictNullHandling: true,
  arrayLimit: 100,
  depth: 20,
};

/**
 * Body parser hook
 */
const addQsParser = (app, settings) => {
  Object.defineProperty(app.request, 'query', {
    configurable: false,
    enumerable: true,
    /*
     * Get parsed query-string.
     */
    get() {
      const qstr = this.querystring;
      this._querycache = this._querycache || {};
      const cache = this._querycache;

      if (!cache[qstr]) {
        cache[qstr] = qs.parse(qstr, settings);
      }

      return cache[qstr];
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

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = (config, { strapi }) => {
  addQsParser(strapi.server.app, defaultsDeep(defaults, config));

  return null;
};
