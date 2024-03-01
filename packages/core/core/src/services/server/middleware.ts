import path from 'path';
import { isArray } from 'lodash/fp';
import { importDefault } from '@strapi/utils';
import type { Core } from '@strapi/types';

const instantiateMiddleware = (
  middlewareFactory: Core.MiddlewareFactory,
  name: string,
  config: unknown,
  strapi: Core.Strapi
) => {
  try {
    return middlewareFactory(config, { strapi });
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`Middleware "${name}": ${e.message}`);
    }
  }
};

const resolveRouteMiddlewares = (route: Core.Route, strapi: Core.Strapi) => {
  const middlewaresConfig = route?.config?.middlewares ?? [];

  if (!isArray(middlewaresConfig)) {
    throw new Error('Route middlewares config must be an array');
  }

  const middlewares = resolveMiddlewares(middlewaresConfig, strapi);

  return middlewares.map(({ handler }) => handler);
};

const dummyMiddleware: Core.MiddlewareHandler = (_, next) => next();

/**
 * Initialize every configured middlewares
 */
const resolveMiddlewares = (
  config: Array<Core.MiddlewareName | Core.MiddlewareConfig | Core.MiddlewareHandler>,
  strapi: Core.Strapi
) => {
  const middlewares: {
    name: string | null;
    handler: Core.MiddlewareHandler;
  }[] = [];

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
        handler: instantiateMiddleware(middlewareFactory, item, {}, strapi) ?? dummyMiddleware,
      });

      continue;
    }

    if (typeof item === 'object' && item !== null) {
      const { name, resolve, config = {} } = item;

      if (name) {
        const middlewareFactory = strapi.middleware(name);
        middlewares.push({
          name,
          handler:
            instantiateMiddleware(middlewareFactory, name, config, strapi) ?? dummyMiddleware,
        });

        continue;
      }

      if (resolve) {
        const resolvedMiddlewareFactory = resolveCustomMiddleware(resolve, strapi);
        middlewares.push({
          name: resolve,
          handler:
            instantiateMiddleware(resolvedMiddlewareFactory, resolve, config, strapi) ??
            dummyMiddleware,
        });

        continue;
      }

      throw new Error('Invalid middleware configuration. Missing name or resolve properties.');
    }

    throw new Error(
      'Middleware config must either be a string or an object {name?: string, resolve?: string, config: any}.'
    );
  }

  return middlewares;
};

/**
 * Resolve middleware from package name or path
 */
const resolveCustomMiddleware = (resolve: string, strapi: Core.Strapi) => {
  let modulePath;

  try {
    modulePath = require.resolve(resolve);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
      modulePath = path.resolve(strapi.dirs.dist.root, resolve);
    } else {
      throw error;
    }
  }

  try {
    return importDefault(modulePath);
  } catch (err) {
    throw new Error(`Could not load middleware "${modulePath}".`);
  }
};

export { resolveRouteMiddlewares, resolveMiddlewares };
