'use strict';

const crudActionsToDisable = ['create', 'update', 'delete'];

module.exports = ({ strapi }) => {
  const extension = strapi.plugin('graphql').service('extension');

  extension.shadowCRUD('plugin::myplugin.test').disableActions(crudActionsToDisable);
};
