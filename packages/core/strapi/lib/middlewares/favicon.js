'use strict';

const { resolve } = require('path');
const { defaultsDeep } = require('lodash');
const favicon = require('koa-favicon');

const defaults = {
  path: 'favicon.ico',
  maxAge: 86400000,
};

// TODO: inject strapi
module.exports = options => {
  const { maxAge, path: faviconPath } = defaultsDeep(defaults, options);

  return favicon(resolve(strapi.dirs.root, faviconPath), { maxAge });
};
