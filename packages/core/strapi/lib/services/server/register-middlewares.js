'use strict';

const { yup } = require('@strapi/utils');

const { resolveMiddlewares } = require('./middleware');

/**
 * @typedef {import('../../').Strapi} Strapi
 * @typedef {Array<string|{name?: string, resolve?: string, config: any}>} MiddlewaresConfig
 * @typedef {Array<{name: string, handler: Function}>} Middlewares
 */

const defaultConfig = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::session',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::favicon',
  'strapi::public',
];

const requiredMiddlewares = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::query',
  'strapi::body',
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
const registerApplicationMiddlewares = async strapi => {
  const middlewareConfig = strapi.config.get('middlewares', defaultConfig);

  await validateMiddlewareConfig(middlewareConfig);

  const middlewares = await resolveMiddlewares(middlewareConfig, strapi);

  checkRequiredMiddlewares(middlewares);

  // NOTE: exclude middlewares that return nothing.
  // this is used for middlewares that only extend the app only need to be added in certain conditions
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

module.exports = registerApplicationMiddlewares;
