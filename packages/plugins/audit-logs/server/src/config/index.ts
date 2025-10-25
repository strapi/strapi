export default {
  default: {
    enabled: true,
    excludeContentTypes: [],
  },
  validator(config: any) {
    if (typeof config.enabled !== 'boolean') {
      throw new Error('auditLogs.enabled must be a boolean');
    }
    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('auditLogs.excludeContentTypes must be an array');
    }
  },
};