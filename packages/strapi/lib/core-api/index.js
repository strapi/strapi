/**
 * Core API
 */
'use strict';

const _ = require('lodash');

const createController = require('./controller');
const { createService } = require('./service');

/**
 * Returns a service and a controller built based on the content type passed
 */
function createCoreApi({ api, model, strapi }) {
  const { modelName } = model;

  // find corresponding service and controller
  const userService = _.get(api, ['services', modelName], {});
  const userController = _.get(api, ['controllers', modelName], {});

  const service = Object.assign(createService({ model, strapi }), userService);

  const controller = Object.assign(createController({ service, model }), userController);

  return {
    service,
    controller,
  };
}

module.exports = {
  createCoreApi,
};
