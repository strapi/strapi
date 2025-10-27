// Example configuration for the audit-logs plugin
// Add this to your config/plugins.js file

module.exports = {
  // ... other plugins
  
  'audit-logs': {
    enabled: true,
    config: {
      // Enable or disable audit logging globally
      enabled: true,
      
      // Content types to exclude from logging
      excludeContentTypes: [
        'plugin::upload.file',
        'plugin::upload.folder',
        'admin::user',           // Exclude admin user changes if desired
        'plugin::users-permissions.user', // Exclude public user changes if desired
      ],
      
      // Which actions to log
      enabledActions: ['create', 'update', 'delete'],
      
      // Retention policy: number of days to keep logs (null = keep forever)
      retentionDays: 365, // Keep logs for 1 year
      
      // Log level for debugging
      logLevel: 'info', // 'debug', 'info', 'warn', 'error'
      
      // Batch size for bulk operations
      batchSize: 100,
    },
  },
  
  // ... other plugins
};