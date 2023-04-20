'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');

const configFeatureFlags = {
  'audit-logs': 'admin.auditLogs.enabled',
  'review-workflows': 'admin.reviewWorkflows.enabled',
};

module.exports = Object.freeze({
  ...features,
  isEnabled(featureName) {
    const featureEnabledInLicense = features.isEnabled(featureName);
    const featureEnabledInConfig = configFeatureFlags[featureName]
      ? strapi.config.get(configFeatureFlags[featureName], true)
      : true;

    return featureEnabledInLicense && featureEnabledInConfig;
  },
});
