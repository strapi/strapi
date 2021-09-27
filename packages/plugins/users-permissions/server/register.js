'use strict';

const authStrategy = require('./strategies/users-permissions');

module.exports = strapi => {
  strapi.container.get('auth').register('content-api', authStrategy);
};
