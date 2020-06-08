'use strict';

module.exports = () => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'content-type-builder',
    },
  ];

  const actionProvider = strapi.admin.services.permission.provider;
  actionProvider.register(actions);
};
