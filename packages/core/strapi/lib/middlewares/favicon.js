'use strict';

const { resolve } = require('path');
const { defaultsDeep } = require('lodash/fp');
const favicon = require('koa-favicon');

const defaults = {
  path: 'favicon.ico',
  maxAge: 86400000,
};

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = (config, { strapi }) => {
  const { maxAge, path: faviconPath } = defaultsDeep(defaults, config);

  return favicon(resolve(strapi.dirs.root, faviconPath), { maxAge });
};
