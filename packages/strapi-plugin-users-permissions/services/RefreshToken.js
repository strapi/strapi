'use strict';

/**
 * RefreshToken.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */
const randtoken = require('rand-token');

module.exports = {
  revoke: async params => {
    params.model = 'refreshtoken';
    return strapi.query('refreshToken', 'users-permissions').delete(params);
  },

  issue: async (user, useragent) => {
    let token = randtoken.uid(255);
    await strapi.query('refreshToken', 'users-permissions').create({ user: user.id, token: token, agent: useragent });
    return token;
  }
};
