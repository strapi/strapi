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
      const { lang } = ctx.query;
      const plugins = await strapi.plugins['users-permissions'].services.userspermissions.getPlugins(lang);
      const permissions = await strapi.plugins['users-permissions'].services.userspermissions.getActions(plugins);
      ctx.send({ permissions });
    } catch(err) {
      ctx.badRequest(null, [{ message: [{ id: 'Not Found' }] }]);
    }
  },

  getPolicies: async (ctx) => {
    return ctx.send({
      policies: _.without(_.keys(strapi.plugins['users-permissions'].config.policies), 'permissions')
    });
  },

  getRole: async (ctx) => {
    const { id } = ctx.params;
    const { lang } = ctx.query;
    const plugins = await strapi.plugins['users-permissions'].services.userspermissions.getPlugins(lang);
    const role = await strapi.plugins['users-permissions'].services.userspermissions.getRole(id, plugins);

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

  getRoutes: async (ctx) => {
    try {
      const routes = await strapi.plugins['users-permissions'].services.userspermissions.getRoutes();

      ctx.send({ routes });
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
    const hasAdmin = await strapi.query('user', 'users-permissions').find(strapi.utils.models.convertParams('user', { role: '0' }));

    ctx.send({ hasAdmin: hasAdmin.length > 0 });
  },

  searchUsers: async (ctx) => {
    const data = await strapi.query('user', 'users-permissions').search(ctx.params);
    return ctx.send(data);
  },

  updateRole: async (ctx) => {
    const roleId = ctx.params.role;
    // Prevent from updating the Administrator role
    if (roleId === '0') {
      return ctx.badRequest(null, [{ messages: [{ id: 'Unauthorized' }] }]);
    }

    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Bad request' }] }]);
    }

    try {
      await strapi.plugins['users-permissions'].services.userspermissions.updateRole(roleId, ctx.request.body);
      ctx.send({ ok: true });
    } catch(error) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  }
};
