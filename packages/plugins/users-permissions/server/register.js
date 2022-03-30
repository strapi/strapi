'use strict';

const authStrategy = require('./strategies/users-permissions');

module.exports = ({ strapi }) => {
  strapi.container.get('auth').register('content-api', authStrategy);

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }

  if (strapi.plugin('documentation')) {
    require('./documentation')({ strapi });
  }
};
