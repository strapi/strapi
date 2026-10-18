'use strict';

const authStrategy = require('./strategies/users-permissions');
const sanitizers = require('./utils/sanitize/sanitizers');
const spec = require('../../documentation/content-api.json');

module.exports = ({ strapi }) => {
  strapi.get('auth').register('content-api', authStrategy);
  strapi.sanitizers.add('content-api.output', sanitizers.defaultSanitizeOutput);

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }

  if (strapi.plugin('documentation')) {
    strapi
      .plugin('documentation')
      .service('override')
      .registerOverride(spec, {
        pluginOrigin: 'users-permissions',
        excludeFromGeneration: ['users-permissions'],
      });
  }
};
