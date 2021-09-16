'use strict';

// Dependencies.
const path = require('path');
const _ = require('lodash');
const glob = require('../../load/glob');

/**
 * Load middlewares
 */
module.exports = async function(strapi) {
  const installedMiddlewares = strapi.config.get('installedMiddlewares');
  const appPath = strapi.config.get('appPath');

  let middlewares = {};

  const loaders = createLoaders(strapi);

  await loaders.loadMiddlewareDependencies(installedMiddlewares, middlewares);
  // internal middlewares
  await loaders.loadInternalMiddlewares(middlewares);
  // local middleware
  await loaders.loadLocalMiddlewares(appPath, middlewares);

  return middlewares;
};

/**
 * Build loader functions
 * @param {*} strapi - strapi instance
 */
const createLoaders = strapi => {
  const loadMiddlewaresInDir = async (dir, middlewares) => {
    const files = await glob('*/*(index|defaults).*(js|json)', {
      cwd: dir,
    });

    files.forEach(f => {
      const name = f.split('/')[0];
      mountMiddleware(name, [path.resolve(dir, f)], middlewares);
    });
  };

  const loadInternalMiddlewares = middlewares =>
    loadMiddlewaresInDir(path.resolve(__dirname, '..', '..', 'middlewares'), middlewares);

  const loadLocalMiddlewares = (appPath, middlewares) =>
    loadMiddlewaresInDir(path.resolve(appPath, 'middlewares'), middlewares);

  const loadMiddlewareDependencies = async (packages, middlewares) => {
    for (let packageName of packages) {
      const baseDir = path.dirname(require.resolve(`@strapi/middleware-${packageName}`));
      const files = await glob('*(index|defaults).*(js|json)', {
        cwd: baseDir,
        absolute: true,
      });

      mountMiddleware(packageName, files, middlewares);
    }
  };

  const mountMiddleware = (name, files, middlewares) => {
    files.forEach(file => {
      middlewares[name] = middlewares[name] || { loaded: false };

      if (_.endsWith(file, 'index.js') && !middlewares[name].load) {
        return Object.defineProperty(middlewares[name], 'load', {
          configurable: false,
          enumerable: true,
          get: () => require(file)(strapi),
        });
      }

      if (_.endsWith(file, 'defaults.json')) {
        middlewares[name].defaults = require(file);
        return;
      }
    });
  };

  return {
    loadInternalMiddlewares,
    loadLocalMiddlewares,
    loadMiddlewareDependencies,
  };
};
