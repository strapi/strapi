'use strict';

const { existsSync } = require('fs');
const { resolve } = require('path');
const { defaultsDeep } = require('lodash/fp');
const favicon = require('koa-favicon');

const defaults = {
  path: 'favicon.png',
  maxAge: 86400000,
};

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = (config, { strapi }) => {
  const { maxAge, path: faviconDefaultPath } = defaultsDeep(defaults, config);
  const { root: appRoot } = strapi.dirs.app;
  let faviconPath = faviconDefaultPath;

  /** TODO (v5): Updating the favicon to use a png caused
   *  https://github.com/strapi/strapi/issues/14693
   *
   *  This check ensures backwards compatibility until
   *  the next major version
   */
  if (!existsSync(resolve(appRoot, faviconPath))) {
    faviconPath = 'favicon.ico';
  }

  return favicon(resolve(appRoot, faviconPath), { maxAge });
};
