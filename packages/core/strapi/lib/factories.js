'use strict';

const { pipe, omit, pick } = require('lodash/fp');

const { createController } = require('./core-api/controller');
const { createService } = require('./core-api/service');
const { createRoutes } = require('./core-api/routes');

// Content type is proxied to allow for dynamic content type updates
const getContentTypeProxy = (strapi, uid) => {
  return new Proxy(strapi.contentType(uid), {
    get(target, prop) {
      const contentType = strapi.contentType(uid);
      return contentType[prop];
    },
  });
};

const createCoreController = (uid, cfg = {}) => {
  return ({ strapi }) => {
    const baseController = createController({
      contentType: getContentTypeProxy(strapi, uid),
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
      contentType: getContentTypeProxy(strapi, uid),
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
  const { prefix, config = {}, only, except, type } = cfg;
  let routes;

  return {
    type,
    prefix,
    get routes() {
      if (!routes) {
        const contentType = strapi.contentType(uid);

        const defaultRoutes = createRoutes({ contentType });

        Object.keys(defaultRoutes).forEach((routeName) => {
          const defaultRoute = defaultRoutes[routeName];

          Object.assign(defaultRoute.config, config[routeName] || {});
        });

        const selectedRoutes = pipe(
          (routes) => (except ? omit(except, routes) : routes),
          (routes) => (only ? pick(only, routes) : routes)
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
