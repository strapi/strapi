'use strict';

module.exports = {
  'audit-logs': {
    enabled: true,
    config: {
      // Enable audit logging by default
      enabled: true,
      
      // Exclude sensitive or high-volume content types if needed
      excludeContentTypes: [
        // Example: 'api::log.log',
        // Example: 'api::audit.audit'
      ],
      
      // Keep audit logs for 30 days by default
      retentionDays: 30
    }
  },
};
