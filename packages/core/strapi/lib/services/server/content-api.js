'use strict';

const { prop } = require('lodash/fp');
const { createAPI } = require('./api');

const getAuthConfig = prop('config.auth');

const createAuthPolicy = strapi => async (ctx, next) => {
  const { auth, route } = ctx.state;

  if (!route) {
    return ctx.unauthorized();
  }

  try {
    await strapi.container.get('content-api').auth.verify(auth, getAuthConfig(route));

    return next();
  } catch (error) {
    const { errors } = strapi.container.get('content-api');

    if (error instanceof errors.UnauthorizedError) {
      return ctx.unauthorized();
    }

    if (error instanceof errors.ForbiddenError) {
      return ctx.forbidden();
    }

    throw error;
  }
};

const createContentAPI = strapi => {
  const opts = {
    prefix: strapi.config.get('api.prefix', '/api'),
    defaultPolicies: [createAuthPolicy(strapi)],
  };

  const api = createAPI(strapi, opts);

  // implement auth providers
  api.use((ctx, next) => {
    return strapi.container.get('content-api').auth.authenticate(ctx, next);
  });

  return api;
};

module.exports = {
  createContentAPI,
};
