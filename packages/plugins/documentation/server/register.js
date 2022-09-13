'use strict';

const registerDocumentationMiddleWare = require('./middlewares/documentation');

/**
 * Register upload plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = async ({ strapi }) => {
  await registerDocumentationMiddleWare({ strapi });
};
