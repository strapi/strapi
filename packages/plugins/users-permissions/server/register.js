'use strict';

const authStrategy = require('./auth/strategy');

module.exports = strapi => {
  strapi.container.get('content-api').auth.register(authStrategy);
};
