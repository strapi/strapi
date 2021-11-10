'use strict';

const createController = require('./core-api/controller');
const { createService } = require('./core-api/service');

const createCoreController = (uid, cfg = {}) => {
  return ({ strapi }) => {
    const deps = {
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

const createCoreService = (uid, cfg) => {
  return ({ strapi }) => {
    const deps = {
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

module.exports = {
  createCoreController,
  createCoreService,
};
