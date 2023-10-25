'use strict';

const { features } = require('@strapi/strapi/dist/utils/ee');

const enableFeatureMiddleware = (featureName) => (ctx, next) => {
  if (features.isEnabled(featureName)) {
    return next();
  }

  ctx.status = 404;
};

module.exports = {
  enableFeatureMiddleware,
};
