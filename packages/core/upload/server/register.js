'use strict';

const registerUploadMiddlware = require('./middlewares/upload');

/**
 * Register upload plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = async ({ strapi }) => {
  await registerUploadMiddlware({ strapi });

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
