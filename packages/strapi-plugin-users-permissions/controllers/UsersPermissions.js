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
  createRole: async (ctx) => {
    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Cannot be empty' }] }]);
    }

    try {
      await strapi.plugins['users-permissions'].services.userspermissions.createRole(ctx.request.body);
      ctx.send({ ok: true });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occured' }] }]);
    }
  },

  deleteProvider: async ctx => {
    const { provider } = ctx.params;

    if (!provider) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Bad request' }] }]);
    }

    // TODO handle dynamic
    return ctx.send({ ok: true });
  },

  deleteRole: async ctx => {
    const { role } = ctx.params;

    if (!role) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Bad request' }] }]);
    }

    if (role === '0' || role === '1') {
      return ctx.badRequest(null, [{ messages: [{ id: 'Unauthorized' }] }]);
    }

    try {
      await strapi.plugins['users-permissions'].services.userspermissions.deleteRole(role);
      return ctx.send({ ok: true });
    } catch(err) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Bad request' }] }]);
    }
  },

  getPermissions: async (ctx) => {
    try {
      const permissions = await strapi.plugins['users-permissions'].services.userspermissions.getActions();
      ctx.send({ permissions });
    } catch(err) {
      ctx.badRequest(null, [{ message: [{ id: 'Not Found' }] }]);
    }
  },

  getRole: async (ctx) => {
    const { id } = ctx.params;
    const role = fakeData[id];

    if (_.isEmpty(role)) {
      return ctx.badRequest(null, [{ messages: [{ id: `Role don't exist` }] }]);
    }

    return ctx.send({ role });
  },

  getRoles: async (ctx) => {
    try {
      const roles = await strapi.plugins['users-permissions'].services.userspermissions.getRoles();

      ctx.send({ roles });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'Not found' }] }]);
    }
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
  },

  searchUsers: async (ctx) => {
    const data = await strapi.query('user', 'users-permissions').search(ctx.params);

    return ctx.send(data);
  },

  updateRole: async (ctx) => {
    try {
      ctx.send({ ok: true });
    } catch(error) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  }
};
