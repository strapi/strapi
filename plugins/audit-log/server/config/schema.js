module.exports = {
  default: {
    enabled: true,
    excludeContentTypes: [],
    logFullPayloadOn: ['create', 'delete'],
    maxDiffSize: 10240
  },
  validator(config) {
    if (typeof config.enabled !== 'boolean') {
      throw new Error('plugin.audit-log.enabled must be boolean');
    }
    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('plugin.audit-log.excludeContentTypes must be array');
    }
  }
};
