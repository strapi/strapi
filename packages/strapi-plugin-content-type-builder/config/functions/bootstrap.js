'use strict';

module.exports = () => {
  const permissions = [
    {
      section: 'plugins',
      displayName: 'Read',
      name: 'read',
      pluginName: 'content-type-builder',
    },
  ];

  strapi.admin.permissionProvider.register(permissions);
};
