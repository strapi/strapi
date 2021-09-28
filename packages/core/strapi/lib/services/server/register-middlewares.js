'use strict';

const { yup } = require('@strapi/utils');

/**
 * @type {import('../../').Strapi} Strapi
 * @type {Array<string|{name?: string, resolve?: string, config: any}>} MiddlewaresConfig
 * @type {Array<{name: string, hanlder: Function}>} Middlewares
 */

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

const requiredMiddlewares = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::request',
  'strapi::public',
  'strapi::favicon',
];

const middlewareConfigSchema = yup.array().of(
  yup.lazy(value => {
    if (typeof value === 'string') {
      return yup.string().required();
    }

    if (typeof value === 'object') {
      return yup
        .object({
          name: yup.string(),
          resolve: yup.string(),
          config: yup.mixed(),
        })
        .required()
        .noUnknown();
    }

    return yup.test(() => false);
  })
);

/**
 * Register middlewares in router
 * @param {Strapi} strapi
 */
module.exports = async strapi => {
  const middlewareConfig = strapi.config.get('middlewares', defaultConfig);

  await validateMiddlewareConfig();

  const middlewares = await initMiddlewares(middlewareConfig, strapi);

  checkRequiredMiddlewares(middlewares);

  for (const middleware of middlewares) {
    strapi.server.use(middleware.handler);
  }
};

/**
 *
 * @param {MiddlewaresConfig} config
 */
const validateMiddlewareConfig = async config => {
  try {
    await middlewareConfigSchema.validate(config, { strict: true, abortEarly: false });
  } catch (error) {
    throw new Error(
      'Invalid middleware configuration. Expected Array<string|{name?: string, resolve?: string, config: any}.'
    );
  }
};

/**
 * Check if some required middlewares are missing in configure middlewares
 * @param {Middlewares} middlewares
 */
const checkRequiredMiddlewares = middlewares => {
  const missingMiddlewares = requiredMiddlewares.filter(name => {
    return middlewares.findIndex(mdl => mdl.name === name) === -1;
  });

  if (missingMiddlewares.length > 0) {
    throw new Error(
      `Missing required middlewares in configuration. Add the following middlewares: "${missingMiddlewares.join(
        ', '
      )}".`
    );
  }

  return;
};

/**
 * Initialize every configured middlewares
 * @param {MiddlewaresConfig} config
 * @param {Strapi} strapi
 * @returns {Middlewares}
 */
const initMiddlewares = async (config, strapi) => {
  const middlewares = [];

  for (const item of config) {
    if (typeof item === 'string') {
      const middlewareFactory = strapi.middleware(item);

      if (!middlewareFactory) {
        throw new Error(`Middleware ${item} not found.`);
      }

      middlewares.push({
        name: item,
        handler: await middlewareFactory(),
      });

      continue;
    }

    if (typeof item === 'object' && item !== null) {
      const { name, resolve, config = {} } = item;

      if (name) {
        const middlewareFactory = strapi.middleware(name);
        middlewares.push({
          name,
          handler: await middlewareFactory(config),
        });

        continue;
      }

      if (resolve) {
        middlewares.push({
          name: resolve,
          handler: await require(resolve)(config),
        });

        continue;
      }

      throw new Error('Invalid middleware configuration. Missing name or resolve properties.');
    }

    throw new Error(
      'Middlware config must either be a string or an object {name?: string, resolve?: string, config: any}.'
    );
  }

  return middlewares;
};
