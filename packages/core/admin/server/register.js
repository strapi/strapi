/* eslint-disable no-unused-vars */
'use strict';

// const permissionsFieldsToPropertiesMigration = require('../migrations/permissions-fields-to-properties');
const adminAuthStrategy = require('./strategies/admin');
const apiTokenAuthStrategy = require('./strategies/api-token');

module.exports = () => {
  const passportMiddleware = strapi.admin.services.passport.init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.container.get('auth').register('admin', adminAuthStrategy);
  strapi.container.get('auth').register('content-api', apiTokenAuthStrategy);

  // FIXME: to implement
  // strapi.db.migrations.register(permissionsFieldsToPropertiesMigration);
};
