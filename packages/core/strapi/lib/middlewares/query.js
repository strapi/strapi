'use strict';

/**
 * @typedef {import('koa')} Koa
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const { defaultsDeep } = require('lodash/fp');
const qs = require('qs');

const defaults = {
  strictNullHandling: true,
  arrayLimit: 100,
  depth: 20,
};

/**
 * Body parser hook
 *
 * @param {Koa} app
 * @param {any} settings
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
      const cache = (this._querycache = this._querycache || {});
      return cache[qstr] || (cache[qstr] = qs.parse(qstr, settings));
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
 * @param {any} config
 * @param {{ strapi: Strapi}} ctx
 */
module.exports = (config, { strapi }) => {
  addQsParser(strapi.server.app, defaultsDeep(defaults, config));

  return null;
};
