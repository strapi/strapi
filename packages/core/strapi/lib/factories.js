'use strict';

const { pipe, omit, pick } = require('lodash/fp');
const { isSingleType } = require('@strapi/utils').contentTypes;
const createController = require('./core-api/controller');
const { createService } = require('./core-api/service');

const createCoreController = (uid, cfg = {}) => {
  return ({ strapi }) => {
    const deps = {
      strapi,
      service: strapi.service(uid),
      contentType: strapi.contentType(uid),
    };

    const baseController = createController(deps);

    let userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : cfg;

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
    const deps = {
      strapi,
      contentType: strapi.contentType(uid),
    };

    const baseService = createService(deps);

    let userService = typeof cfg === 'function' ? cfg({ strapi }) : cfg;

    for (const methodName of Object.keys(baseService)) {
      if (userService[methodName] === undefined) {
        userService[methodName] = baseService[methodName];
      }
    }

    Object.setPrototypeOf(userService, baseService);
    return userService;
  };
};

const getSingleTypeRoutes = ({ uid, info }) => {
  return {
    find: {
      method: 'GET',
      path: `/${info.pluralName}`,
      handler: `${uid}.find`,
      config: {},
    },
    createOrUpdate: {
      method: 'PUT',
      path: `/${info.pluralName}`,
      handler: `${uid}.update`,
      config: {},
    },
    delete: {
      method: 'DELETE',
      path: `/${info.pluralName}`,
      handler: `${uid}.delete`,
      config: {},
    },
  };
};

const getCollectionTypeRoutes = ({ uid, info }) => {
  return {
    find: {
      method: 'GET',
      path: `/${info.pluralName}`,
      handler: `${uid}.find`,
      config: {},
    },
    findOne: {
      method: 'GET',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.findOne`,
      config: {},
    },
    create: {
      method: 'POST',
      path: `/${info.pluralName}`,
      handler: `${uid}.create`,
      config: {},
    },
    update: {
      method: 'PUT',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.update`,
      config: {},
    },
    delete: {
      method: 'DELETE',
      path: `/${info.pluralName}/:id`,
      handler: `${uid}.delete`,
      config: {},
    },
  };
};

const getDefaultRoutes = ({ contentType }) => {
  if (isSingleType(contentType)) {
    return getSingleTypeRoutes(contentType);
  }

  return getCollectionTypeRoutes(contentType);
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

        const defaultRoutes = getDefaultRoutes({ contentType });

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
