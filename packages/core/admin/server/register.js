'use strict';

const registerAdminPanelRoute = require('./routes/serve-admin-panel');

const adminAuthStrategy = require('./strategies/admin');

const apiTokenAuthStrategy = require('./strategies/api-token');

module.exports = ({ strapi }) => {
  const passportMiddleware = strapi.admin.services.passport.init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.container.get('auth').register('admin', adminAuthStrategy);
  strapi.container.get('auth').register('content-api', apiTokenAuthStrategy);

  if (strapi.config.serveAdminPanel) {
    registerAdminPanelRoute({ strapi });
  }
};
