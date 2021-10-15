'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const adminAuthStrategy = require('./strategies/admin');
// const apiTokenAuthStrategy = require('./strategies/api-token');

/**
 * @param {{ strapi: Strapi }} ctx
 */
module.exports = ({ strapi }) => {
  const passportMiddleware = strapi.admin.services.passport.init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.container.get('auth').register('admin', adminAuthStrategy);
  // strapi.container.get('auth').register('content-api', apiTokenAuthStrategy);
};
