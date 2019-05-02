'use strict';

// Dependencies.
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const glob = require('../load/glob');
const findPackagePath = require('../load/package-path');

const requiredMiddlewares = {
  kcors: 'kcors',
  body: 'koa-body',
  compose: 'koa-compose',
  compress: 'koa-compress',
  convert: 'koa-convert',
  favicon: 'koa-favicon',
  i18n: 'koa-i18n',
  ip: 'koa-ip',
  locale: 'koa-locale',
  lusca: 'koa-lusca',
  routerJoi: 'koa-router-joi',
  session: 'koa-session',
  static: 'koa-static',
  qs: 'koa-qs',
};

/**
 * Load middlewares
 */
module.exports = async function(strapi) {
  const { installedMiddlewares, installedPlugins, appPath } = strapi.config;

  let middlewares = {};
  let koaMiddlewares = {};

  Object.keys(requiredMiddlewares).forEach(key => {
    Object.defineProperty(koaMiddlewares, key, {
      configurable: false,
      enumerable: true,
      get: () => require(requiredMiddlewares[key]),
    });
  });

  const loaders = createLoaders(strapi);

  await Promise.all([
    // load installed middlewares
    loaders.loadMiddlewareDependencies(installedMiddlewares, middlewares),
    // internal middlewares
    loaders.loadInternalMiddlexares(middlewares),
    // local middleware
    loaders.loadLocalMiddlewares(appPath, middlewares),
    // plugins middlewares
    loaders.loadPluginsMiddlewares(installedPlugins, middlewares),
    // local plugin middlewares
    loaders.loadLocalPluginsMiddlewares(appPath, middlewares),
  ]);

  return {
    middlewares,
    koaMiddlewares,
  };
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

  const loadInternalMiddlexares = middlewares =>
    loadMiddlewaresInDir(
      path.resolve(__dirname, '..', 'middlewares'),
      middlewares
    );

  const loadLocalMiddlewares = (appPath, middlewares) =>
    loadMiddlewaresInDir(path.resolve(appPath, 'middlewares'), middlewares);

  const loadPluginsMiddlewares = async (plugins, middlewares) => {
    for (let pluginName of plugins) {
      const dir = path.resolve(
        findPackagePath(`strapi-plugin-${pluginName}`),
        'middlewares'
      );
      await loadMiddlewaresInDir(dir, middlewares);
    }
  };

  const loadLocalPluginsMiddlewares = async (appPath, middlewares) => {
    const pluginsDir = path.resolve(appPath, 'plugins');
    if (!fs.existsSync(pluginsDir)) return;

    const pluginsNames = await fs.readdir(pluginsDir);

    for (let pluginFolder of pluginsNames) {
      const dir = path.resolve(pluginsDir, pluginFolder, 'middlewares');
      await loadMiddlewaresInDir(dir, middlewares);
    }
  };

  const loadMiddlewareDependencies = async (packages, middlewares) => {
    for (let packageName of packages) {
      const baseDir = path.dirname(
        require.resolve(`strapi-middleware-${packageName}`)
      );
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
    loadInternalMiddlexares,
    loadLocalMiddlewares,
    loadPluginsMiddlewares,
    loadLocalPluginsMiddlewares,
    loadMiddlewareDependencies,
  };
};
