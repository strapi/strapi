'use strict';

const registerUploadMiddleware = require('./middlewares/upload');

/**
 * Register upload plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = async ({ strapi }) => {
  await registerUploadMiddleware({ strapi });

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
