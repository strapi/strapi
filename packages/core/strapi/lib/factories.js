'use strict';

const createController = require('./core-api/controller');
const { createService } = require('./core-api/service');

const createCoreController = (uid, cfg) => {
  return ({ strapi }) => {
    const deps = {
      service: strapi.service(uid),
      contentType: strapi.contentType(uid),
    };

    const baseController = createController(deps);

    let userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : cfg;

    // TODO: can only extend the defined action so we can add some without creating breaking

    return Object.assign(
      Object.create(baseController),
      {
        get coreController() {
          return baseController;
        },
      },
      userCtrl
    );
  };
};

const createCoreService = (uid, cfg) => {
  return ({ strapi }) => {
    const deps = {
      contentType: strapi.contentType(uid),
    };

    const baseService = createService(deps);

    let userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : cfg;

    return Object.assign(baseService, userCtrl);
  };
};

module.exports = {
  createCoreController,
  createCoreService,
};
