'use strict';

module.exports = async ({ strapi }) => {
  const actions = [
    {
      section: 'plugins',
      category: 'Content-type Builder',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'content-type-builder',
    },
  ];

  await strapi.admin.services.permission.actionProvider.registerMany(actions);
};
