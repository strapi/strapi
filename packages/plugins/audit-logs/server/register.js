'use strict';

module.exports = {
  register({ strapi }) {
    // Register the audit-logs permission action
    strapi.admin.services.permission.actionProvider.register({
      uid: 'read',
      section: 'plugins',
      displayName: 'Read audit logs',
      pluginName: 'audit-logs',
    });
  },

  bootstrap({ strapi }) {
    // Register the middleware
    strapi.server.use(strapi.plugin('audit-logs').middleware('audit-logger'));
  },

  destroy({ strapi }) {
    // Cleanup if needed
  },
};
