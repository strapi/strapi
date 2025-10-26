export default {
  default: {
    // Global enable/disable
    enabled: true,

    // Content types to exclude from logging
    // Add sensitive or high-volume content types here
    excludeContentTypes: [
      // Example exclusions:
      // 'admin::user',
      // 'plugin::upload.file',
    ],

    // Store full payload for creates (vs just IDs)
    // Setting this to false reduces storage requirements
    storeFullPayload: true,

    // Retention policy in days (0 = keep forever)
    // Audit logs older than this will be automatically deleted
    retentionDays: 90,

    // Enable async logging to prevent blocking main operations
    // Recommended for high-traffic applications
    asyncLogging: true,

    // Capture IP address and user agent from requests
    // Useful for security auditing
    captureRequestMetadata: true,
  },

  validator(config) {
    // Validate configuration
    if (typeof config.enabled !== 'boolean') {
      throw new Error('audit-log.enabled must be a boolean');
    }

    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('audit-log.excludeContentTypes must be an array');
    }

    if (typeof config.retentionDays !== 'number' || config.retentionDays < 0) {
      throw new Error('audit-log.retentionDays must be a non-negative number');
    }

    if (typeof config.storeFullPayload !== 'boolean') {
      throw new Error('audit-log.storeFullPayload must be a boolean');
    }

    if (typeof config.asyncLogging !== 'boolean') {
      throw new Error('audit-log.asyncLogging must be a boolean');
    }

    if (typeof config.captureRequestMetadata !== 'boolean') {
      throw new Error('audit-log.captureRequestMetadata must be a boolean');
    }
  },
};

