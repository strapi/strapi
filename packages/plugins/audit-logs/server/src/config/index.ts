export default {
  default: {
    enabled: true,
    excludeContentTypes: ['plugin::upload.file', 'plugin::upload.folder'],
    retentionDays: null, // null means keep forever, number for days to keep
    enabledActions: ['create', 'update', 'delete'], // which actions to log
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    batchSize: 100, // for bulk operations
  },
  validator: (config) => {
    if (typeof config.enabled !== 'boolean') {
      throw new Error('audit-logs.enabled must be a boolean');
    }
    
    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('audit-logs.excludeContentTypes must be an array');
    }
    
    if (config.retentionDays !== null && (!Number.isInteger(config.retentionDays) || config.retentionDays <= 0)) {
      throw new Error('audit-logs.retentionDays must be null or a positive integer');
    }

    if (!Array.isArray(config.enabledActions)) {
      throw new Error('audit-logs.enabledActions must be an array');
    }

    const validActions = ['create', 'update', 'delete'];
    for (const action of config.enabledActions) {
      if (!validActions.includes(action)) {
        throw new Error(`audit-logs.enabledActions contains invalid action: ${action}. Valid actions are: ${validActions.join(', ')}`);
      }
    }

    return config;
  },
};