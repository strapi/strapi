'use strict';

const authStrategy = require('./strategies/users-permissions');
const sanitizers = require('./utils/sanitize/sanitizers');

module.exports = ({ strapi }) => {
  strapi.container.get('auth').register('content-api', authStrategy);
  strapi.sanitizers.add('content-api.output', sanitizers.defaultSanitizeOutput);

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
