'use strict';

const defaultConfig = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::request',
  'strapi::favicon',
  'strapi::public',
];

/**
 * Register middlewares in router
 * @param {import('../../').Strapi} strapi
 */
module.exports = strapi => {
  const middlewareConfig = strapi.config.get('middlewares', defaultConfig);

  // must be an array
  // verify required middlewares are register

  const middlewares = [];

  for (const item of middlewareConfig) {
    if (typeof item === 'string') {
      const middlewareFactory = strapi.middleware(item);

      if (!middlewareFactory) {
        throw new Error(`Middleware ${item} not found.`);
      }

      middlewares.push(middlewareFactory());
      continue;
    }

    if (typeof item === 'object' && item !== null) {
      const { name, resolve, config = {} } = item;

      if (name) {
        const middlewareFactory = strapi.middleware(name);
        middlewares.push(middlewareFactory(config));
        continue;
      }

      if (resolve) {
        middlewares.push(require(resolve)(config));
        continue;
      }

      throw new Error('Missing name or resolve');
    }

    throw new Error(
      'Middlware config must either be a string or an object (name?: string, resolve?: string, config: any)'
    );
  }

  for (const middleware of middlewares) {
    strapi.server.use(middleware);
  }
};
