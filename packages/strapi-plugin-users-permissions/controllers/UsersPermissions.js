'use strict';

/**
 * UsersPermissions.js controller
 *
 * @description: A set of functions called "actions" of the `users-permissions` plugin.
 */

const _ = require('lodash');

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */

  index: async (ctx) => {
    // Add your own logic here.

    // Send 200 `ok`
    ctx.send({
      message: 'ok'
    });
  },

  init: async (ctx) => {
    const hasAdmin = await strapi.query('user', 'users-permissions').find({
      where: {
        admin: true
      }
    });

    ctx.send({ hasAdmin: !_.isEmpty(hasAdmin) });
  }
};
