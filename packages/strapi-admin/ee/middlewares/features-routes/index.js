'use strict';

const { features } = require('../../../../strapi/lib/utils/ee');
const routes = require('./routes');

module.exports = strapi => ({
  beforeInitialize() {
    strapi.config.hook.load.before.unshift('admin');
  },

  initialize() {
    loadFeaturesRoutes();
  },
});

const loadFeaturesRoutes = () => {
  for (const [feature, getFeatureRoutes] of Object.entries(routes)) {
    if (features.isEnabled(feature)) {
      strapi.admin.config.routes.push(...getFeatureRoutes());
    }
  }
};
