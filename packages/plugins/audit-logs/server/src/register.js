'use strict';

const { createLogger } = require('./utils');

/**
 * Register function
 * Registers custom permissions for the plugin
 */
module.exports = ({ strapi }) => {
  const logger = createLogger(strapi);

  // Register the 'read' permission action for audit logs
  strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'audit-logs',
    },
  ]);

  logger.info('Custom permission registered: plugin::audit-logs.read');
};
