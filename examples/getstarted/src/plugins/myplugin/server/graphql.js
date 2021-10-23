'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const crudActionsToDisable = ['create', 'update', 'delete'];

/**
 *
 * @param {{
 *  strapi: Strapi
 * }} ctx
 */
module.exports = ({ strapi }) => {
  const extension = strapi.plugin('graphql').service('extension');

  extension.shadowCRUD('plugin::myplugin.test').disableActions(crudActionsToDisable);
};
