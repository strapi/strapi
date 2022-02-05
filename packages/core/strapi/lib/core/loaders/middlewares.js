'use strict';

const { join, extname, basename } = require('path');
const fse = require('fs-extra');
const jiti = require('jiti')(__dirname);

// TODO:: allow folders with index.js inside for bigger policies
module.exports = async function loadMiddlewares(strapi) {
  const localMiddlewares = await loadLocalMiddlewares(strapi);
  const internalMiddlewares = require('../../middlewares');

  strapi.container.get('middlewares').add(`global::`, localMiddlewares);
  strapi.container.get('middlewares').add(`strapi::`, internalMiddlewares);
};

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

    if (fd.isFile()) {
      const ext = extname(name);
      switch (ext) {
        case '.js':
        case '.cjs':
          middlewares[basename(name, ext)] = require(fullPath);
          break;
        case '.mjs':
        case '.ts':
          try {
            const esModule = jiti(fullPath);

            if (!esModule || !esModule.default) {
              throw new Error(`The file has no default export`);
            }

            middlewares[basename(name, ext)] = esModule.default;
          } catch (error) {
            throw new Error(
              `Could not load es/ts module middleware file ${fullPath}: ${error.message}`
            );
          }
          break;
      }
    }
  }

  return middlewares;
};
