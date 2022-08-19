'use strict';

const path = require('path');
const { propOr, isArray, isNil } = require('lodash/fp');

const getMiddlewareConfig = propOr([], 'config.middlewares');

const instantiateMiddleware = (middlewareFactory, name, config, strapi) => {
  try {
    return middlewareFactory(config, { strapi });
  } catch (e) {
    throw new Error(`Middleware "${name}": ${e.message}`);
  }
};

const resolveRouteMiddlewares = (route, strapi) => {
  const middlewaresConfig = getMiddlewareConfig(route);

  if (!isArray(middlewaresConfig)) {
    throw new Error('Route middlewares config must be an array');
  }

  const middlewares = resolveMiddlewares(middlewaresConfig, strapi);

  return middlewares.map(({ handler }) => handler);
};

/**
 * Initialize every configured middlewares
 * @param {MiddlewaresConfig} config
 * @param {Strapi} strapi
 * @returns {Middlewares}
 */
const resolveMiddlewares = (config, strapi) => {
  const middlewares = [];

  for (const item of config) {
    if (typeof item === 'function') {
      middlewares.push({
        name: null,
        handler: item,
      });

      continue;
    }

    if (typeof item === 'string') {
      const middlewareFactory = strapi.middleware(item);

      if (!middlewareFactory) {
        throw new Error(`Middleware ${item} not found.`);
      }

      middlewares.push({
        name: item,
        handler: instantiateMiddleware(middlewareFactory, item, {}, strapi),
      });

      continue;
    }

    if (typeof item === 'object' && item !== null) {
      const { name, resolve, config = {} } = item;

      if (name) {
        const middlewareFactory = strapi.middleware(name);
        middlewares.push({
          name,
          handler: instantiateMiddleware(middlewareFactory, name, config, strapi),
        });

        continue;
      }

      if (resolve) {
        const resolvedMiddlewareFactory = resolveCustomMiddleware(resolve, strapi);
        middlewares.push({
          name: resolve,
          handler: instantiateMiddleware(resolvedMiddlewareFactory, item, config, strapi),
        });

        continue;
      }

      throw new Error('Invalid middleware configuration. Missing name or resolve properties.');
    }

    throw new Error(
      'Middleware config must either be a string or an object {name?: string, resolve?: string, config: any}.'
    );
  }

  middlewares.forEach((middleware) => {
    // NOTE: we replace null middlewares by a dumb one to avoid having to filter later on
    if (isNil(middleware.handler)) {
      middleware.handler = (_, next) => next();
    }
  });

  return middlewares;
};

/**
 * Resolve middleware from package name or path
 * @param {string} resolve
 * @param {Strapi} strapi
 */
const resolveCustomMiddleware = (resolve, strapi) => {
  let modulePath;

  try {
    modulePath = require.resolve(resolve);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      modulePath = path.resolve(strapi.dirs.dist.root, resolve);
    } else {
      throw error;
    }
  }

  try {
    return require(modulePath);
  } catch (err) {
    throw new Error(`Could not load middleware "${modulePath}".`);
  }
};

module.exports = {
  resolveRouteMiddlewares,
  resolveMiddlewares,
};
