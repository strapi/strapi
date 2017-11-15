'use strict';

const fakeData = require('../config/fakeData.json');
const _ = require('lodash');
/**
 * UsersPermissions.js controller
 *
 * @description: A set of functions called "actions" of the `users-permissions` plugin.
 */

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */

  getPermissions: async(ctx) => {
    try {
      ctx.send({ permissions: fakeData.permissions });
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
    // Will be deleted
    ctx.send({ hasAdmin: ctx.params.hasAdmin === 'true' });
  }
};
