'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const { resolve } = require('path');
const { defaultsDeep } = require('lodash/fp');
const favicon = require('koa-favicon');

const defaults = {
  path: 'favicon.ico',
  maxage: 86400000,
};

/**
 * @param {any} config
 * @param {{ strapi: Strapi}} ctx
 */
module.exports = (config, { strapi }) => {
  const { maxage, path: faviconPath } = defaultsDeep(defaults, config);

  return favicon(resolve(strapi.dirs.root, faviconPath), { maxage });
};
