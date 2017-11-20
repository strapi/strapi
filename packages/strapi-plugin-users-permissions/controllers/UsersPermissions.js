'use strict';

/**
 * UsersPermissions.js controller
 *
 * @description: A set of functions called "actions" of the `users-permissions` plugin.
 */

const fakeData = require('../config/fakeData.json');
const _ = require('lodash');

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */

  getPermissions: async(ctx) => {
    try {
      const permissions = await strapi.plugins['users-permissions'].services.userspermissions.getActions();
      ctx.send({ permissions });
    } catch(err) {
      ctx.badRequest(null, [{ message: [{ id: 'Not Found' }] }]);
    }
  },

  getRole: async(ctx) => {
    const { id } = ctx.params;
    const role = fakeData[id];

    if (_.isEmpty(role)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Role don\'t exist' }] }]);
    }

    return ctx.send({ role });
  },

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
