'use strict';

const { register: registerDataTransferRoute } = require('@strapi/data-transfer/lib/strapi');

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

  if (
    process.env.STRAPI_EXPERIMENTAL === 'true' &&
    process.env.STRAPI_DISABLE_REMOTE_DATA_TRANSFER !== 'true'
  ) {
    registerDataTransferRoute(strapi);
  }
};
