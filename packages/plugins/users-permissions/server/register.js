'use strict';

const fs = require('fs');
const path = require('path');

const authStrategy = require('./strategies/users-permissions');
const sanitizers = require('./utils/sanitize/sanitizers');

module.exports = ({ strapi }) => {
  strapi.get('auth').register('content-api', authStrategy);
  strapi.sanitizers.add('content-api.output', sanitizers.defaultSanitizeOutput);

  // Auth-sensitive models: reads must always hit the writer so a blocked user or
  // revoked permission isn't evaluated from a lagging read replica (incl. on
  // `auth: false` routes like login that bypass the auth phase).
  strapi.db.routing.registerWriterModels([
    'plugin::users-permissions.user',
    'plugin::users-permissions.role',
    'plugin::users-permissions.permission',
  ]);

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }

  if (strapi.plugin('documentation')) {
    const specPath = path.join(__dirname, '../../documentation/content-api.yaml');
    const spec = fs.readFileSync(specPath, 'utf8');

    strapi
      .plugin('documentation')
      .service('override')
      .registerOverride(spec, {
        pluginOrigin: 'users-permissions',
        excludeFromGeneration: ['users-permissions'],
      });
  }
};
