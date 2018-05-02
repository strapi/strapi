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
    ctx.send({ ok: true });
  },

  deleteRole: async ctx => {
    // Fetch root and public role.
    const [root, publicRole] = await Promise.all([
      strapi.query('role', 'users-permissions').findOne({ type: 'root' }),
      strapi.query('role', 'users-permissions').findOne({ type: 'public' })
    ]);

    const rootID = root.id || root._id;
    const publicRoleID = publicRole.id || publicRole._id;

    const roleID = ctx.params.role;

    if (!roleID) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Bad request' }] }]);
    }

    // Prevent from removing the root role.
    if (roleID.toString() === rootID.toString() || roleID.toString() === publicRoleID.toString()) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Unauthorized' }] }]);
    }

    try {
      await strapi.plugins['users-permissions'].services.userspermissions.deleteRole(roleID, publicRoleID);

      ctx.send({ ok: true });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'Bad request' }] }]);
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
    ctx.send({
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

    ctx.send({ role });
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
    const role = await strapi.query('role', 'users-permissions').findOne({ type: 'root' }, ['users']);

    ctx.send({ hasAdmin: !_.isEmpty(role.users) });
  },

  searchUsers: async (ctx) => {
    const data = await strapi.query('user', 'users-permissions').search(ctx.params);

    ctx.send(data);
  },

  updateRole: async function (ctx) {
    // Fetch root role.
    const root = await strapi.query('role', 'users-permissions').findOne({ type: 'root' });

    const roleID = ctx.params.role;
    const rootID = root.id || root._id;

    // Prevent from updating the root role.
    if (roleID === rootID) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Unauthorized' }] }]);
    }

    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Bad request' }] }]);
    }

    try {
      await strapi.plugins['users-permissions'].services.userspermissions.updateRole(roleID, ctx.request.body);

      ctx.send({ ok: true });
    } catch(error) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  getEmailTemplate: async (ctx) => {
    ctx.send(await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'email'
    }).get());
  },

  updateEmailTemplate: async (ctx) => {
    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Cannot be empty' }] }]);
    }

    await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'email'
    }).set({value: ctx.request.body});

    ctx.send({ ok: true });
  },

  getAdvancedSettings: async (ctx) => {
    ctx.send({
      settings: await strapi.store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced'
      }).get(),
      roles: await strapi.plugins['users-permissions'].services.userspermissions.getRoles()
    });
  },

  updateAdvancedSettings: async (ctx) => {
    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Cannot be empty' }] }]);
    }

    await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'advanced'
    }).set({value: ctx.request.body});

    ctx.send({ ok: true });
  },

  getProviders: async (ctx) => {
    ctx.send(await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'grant'
    }).get());
  },

  updateProviders: async (ctx) => {
    if (_.isEmpty(ctx.request.body)) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Cannot be empty' }] }]);
    }

    await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'grant'
    }).set({value: ctx.request.body});

    ctx.send({ ok: true });
  }
};
