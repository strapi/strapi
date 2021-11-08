/**
 * Core API
 */
'use strict';

const createController = require('./controller');
const { createService } = require('./service');

/**
 * Returns a service and a controller built based on the content type passed
 *
 * @param {object} opts options
 * @param {object} opts.api api
 * @param {object} opts.model model
 * @param {object} opts.strapi strapi
 * @returns {object} controller & service
 */
function createCoreApi({ api, contentType, strapi }) {
  const { modelName } = contentType;

  // find corresponding service and controller
  const userService = api.service(modelName);
  const userController = api.controller(modelName);

  const service = Object.assign(createService({ contentType, strapi }), userService);
  const controller = Object.assign(createController({ service, contentType }), userController);

  return {
    service,
    controller,
  };
}

module.exports = {
  createCoreApi,
};
