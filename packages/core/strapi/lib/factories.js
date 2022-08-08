'use strict';

const { pipe, omit, pick } = require('lodash/fp');

const { createController } = require('./core-api/controller');
const { createService } = require('./core-api/service');
const { createRoutes } = require('./core-api/routes');

const createCoreController = (uid, cfg = {}) => {
  return ({ strapi }) => {
    const baseController = createController({
      contentType: strapi.contentType(uid),
    });

    const userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : cfg;

    for (const methodName of Object.keys(baseController)) {
      if (userCtrl[methodName] === undefined) {
        userCtrl[methodName] = baseController[methodName];
      }
    }

    Object.setPrototypeOf(userCtrl, baseController);
    return userCtrl;
  };
};

const createCoreService = (uid, cfg = {}) => {
  return ({ strapi }) => {
    const baseService = createService({
      contentType: strapi.contentType(uid),
    });

    const userService = typeof cfg === 'function' ? cfg({ strapi }) : cfg;

    for (const methodName of Object.keys(baseService)) {
      if (userService[methodName] === undefined) {
        userService[methodName] = baseService[methodName];
      }
    }

    Object.setPrototypeOf(userService, baseService);
    return userService;
  };
};

const createCoreRouter = (uid, cfg = {}) => {
  const { prefix, config = {}, only, except } = cfg;
  let routes;

  return {
    get prefix() {
      return prefix;
    },
    get routes() {
      if (!routes) {
        const contentType = strapi.contentType(uid);

        const defaultRoutes = createRoutes({ contentType });

        Object.keys(defaultRoutes).forEach(routeName => {
          const defaultRoute = defaultRoutes[routeName];

          Object.assign(defaultRoute.config, config[routeName] || {});
        });

        const selectedRoutes = pipe(
          routes => (except ? omit(except, routes) : routes),
          routes => (only ? pick(only, routes) : routes)
        )(defaultRoutes);

        routes = Object.values(selectedRoutes);
      }

      return routes;
    },
  };
};

module.exports = {
  createCoreController,
  createCoreService,
  createCoreRouter,
};
