'use strict';

const { castArray, has, prop } = require('lodash/fp');

const { createAPI } = require('./api');

const authPolicy = (ctx, next) => {
  const { route } = ctx.state;

  if (!route) {
    return ctx.unauthorized();
  }

  const { config } = route;

  if (prop('auth.public', config) === true) {
    return next();
  }

  if (!ctx.state.auth) {
    return ctx.unauthorized();
  }

  const { isAuthenticated = false } = ctx.state.auth || {};

  if (!isAuthenticated) {
    return ctx.unauthorized();
  }

  if (!has('auth.scope', config)) {
    return ctx.unauthorized();
  }

  if (config.auth.scope === '*') {
    // just requires authentication
    return next();
  }

  const hasValidScope = castArray(config.auth.scope).every(scope =>
    ctx.state.auth.scope.includes(scope)
  );

  if (!hasValidScope) {
    return ctx.forbidden();
  }

  return next();
};

const createContentAPI = strapi => {
  const opts = {
    prefix: '', // strapi.config.get('api.prefix', '/api'),
    defaultPolicies: [authPolicy],
  };

  const api = createAPI(strapi, opts);

  // implement auth providers
  api.use(async (ctx, next) => {
    await strapi.container.get('content-api').auth.authenticate(ctx);

    return next();
  });

  return api;
};

module.exports = {
  createContentAPI,
};
