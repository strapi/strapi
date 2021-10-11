/**
 * Core API
 */
'use strict';

const _ = require('lodash');

const createController = require('./controller');
const { createService } = require('./service');

/**
 * Returns a service and a controller built based on the content type passed
 *
 * @param {object} opts options
 * @param {object} opts.api api
 * @param {object} opts.model model
 * @param {object} opts.strapi strapi
 */
function createCoreApi({ api, model, strapi }) {
  const { modelName } = model;

  // find corresponding service and controller
  const userService = _.get(api, ['services', modelName], {});
  const userController = _.get(api, ['controllers', modelName], {});

  const service = createService({ model, strapi });
  Object.assign(service, userService);

  const controller = createController({ service, model });
  Object.assign(controller, userController);

  return {
    service,
    controller,
  };
}

module.exports = {
  createCoreApi,
};
