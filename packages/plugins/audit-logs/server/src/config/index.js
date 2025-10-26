'use strict';

const { CONTENT_TYPE_UID } = require('../constants');

module.exports = {
  default: {
    // Enable or disable audit logging globally
    enabled: true,

    // Content types to exclude from audit logging
    excludeContentTypes: [
      'plugin::upload.file',
      'plugin::upload.folder',
      CONTENT_TYPE_UID, // Don't log audit logs themselves
      'admin::permission',
      'admin::user',
      'admin::role',
      'admin::api-token',
      'admin::api-token-permission',
      'admin::transfer-token',
      'admin::transfer-token-permission',
    ],
  },

  validator(config) {
    // Validate enabled flag
    if (typeof config.enabled !== 'boolean') {
      throw new Error('audit-logs config error: "enabled" must be a boolean');
    }

    // Validate excludeContentTypes
    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('audit-logs config error: "excludeContentTypes" must be an array');
    }

    // Validate each excluded content type is a string
    config.excludeContentTypes.forEach((contentType, index) => {
      if (typeof contentType !== 'string') {
        throw new Error(
          `audit-logs config error: "excludeContentTypes[${index}]" must be a string, got ${typeof contentType}`
        );
      }
    });

    // Ensure audit-logs content type is always excluded (prevent infinite loop)
    if (!config.excludeContentTypes.includes(CONTENT_TYPE_UID)) {
      config.excludeContentTypes.push(CONTENT_TYPE_UID);
    }

    return config;
  },
};
