'use strict';

/**
 * @typedef {import('../registries/types/middlewares').Middleware} Middleware
 * @typedef {import('types').Strapi} Strapi
 */

const { join, extname, basename } = require('path');
const fse = require('fs-extra');

/**
 * TODO:: allow folders with index.js inside for bigger policies
 *
 * @param {Strapi} strapi
 * @returns {Promise<void>}
 */
module.exports = async function loadMiddlewares(strapi) {
  const localMiddlewares = await loadLocalMiddlewares(strapi);
  /**
   * @type {import('../../middlewares')}
   */
  const internalMiddlewares = require('../../middlewares');

  strapi.container.get('middlewares').add(`global::`, localMiddlewares);
  strapi.container.get('middlewares').add(`strapi::`, internalMiddlewares);
};
/**
 * TODO:: allow folders with index.js inside for bigger policies
 *
 * @param {Strapi} strapi
 * @returns {Promise<Record<string, Middleware>>}
 */
const loadLocalMiddlewares = async strapi => {
  const dir = strapi.dirs.middlewares;

  if (!(await fse.pathExists(dir))) {
    return {};
  }

  const middlewares = {};
  const paths = await fse.readdir(dir, { withFileTypes: true });

  for (const fd of paths) {
    const { name } = fd;
    const fullPath = join(dir, name);

    if (fd.isFile() && extname(name) === '.js') {
      const key = basename(name, '.js');
      middlewares[key] = require(fullPath);
    }
  }

  return middlewares;
};
