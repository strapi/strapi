'use strict';

module.exports = () => {
  const permissions = [
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'content-type-builder',
    },
  ];

  const permissionProvider = strapi.admin.services['permission-provider'];
  permissionProvider.register(permissions);
};
