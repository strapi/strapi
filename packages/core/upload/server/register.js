'use strict';

const registerUploadMiddlware = require('./controllers/upload-middleware');

module.exports = async ({ strapi }) => {
  await registerUploadMiddlware();

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
