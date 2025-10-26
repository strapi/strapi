'use strict';

module.exports = {
  default: {
    enabled: true,
    excludeContentTypes: [],
    retentionDays: 30
  },
  validator(config) {
    if (typeof config.enabled !== 'boolean') {
      throw new Error('config.enabled must be a boolean');
    }
    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('config.excludeContentTypes must be an array');
    }
    if (typeof config.retentionDays !== 'number' || config.retentionDays < 1) {
      throw new Error('config.retentionDays must be a positive number');
    }
  }
};
