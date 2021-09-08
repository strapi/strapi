'use strict';

const authStrategy = require('./auth/strategy');

module.exports = strapi => {
  strapi.container.get('auth').register('content-api', authStrategy);
};
