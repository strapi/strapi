'use strict';

const permissionsFieldsToPropertiesMigration = require('../migrations/permissions-fields-to-properties');

module.exports = () => {
  strapi.db.migrations.register(permissionsFieldsToPropertiesMigration);
};
