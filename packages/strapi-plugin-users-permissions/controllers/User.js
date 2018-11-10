'use strict';

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

const _ = require('lodash');

module.exports = {

  /**
   * Retrieve user records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    let data = await strapi.plugins['users-permissions'].services.user.fetchAll(ctx.query);
    data.reduce((acc, user) => {
      acc.push(_.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken']));
      return acc;
    }, []);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Retrieve authenticated user.
   *
   * @return {Object|Array}
   */

  me: async (ctx) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
    }

    const data = _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken']);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Retrieve a user record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    let data = await strapi.plugins['users-permissions'].services.user.fetch(ctx.params);

    if (data) {
      data = _.omit(data.toJSON ? data.toJSON() : data, ['password', 'resetPasswordToken']);
    }

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Create a/an user record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const advanced = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'advanced'
    }).get();

    if (advanced.unique_email && ctx.request.body.email) {
      const user = await strapi.query('user', 'users-permissions').findOne({ email: ctx.request.body.email });

      if (user) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.email.taken', field: ['email'] }] }] : 'Email is already taken.');
      }
    }

    if (!ctx.request.body.role) {
      const defaultRole = await strapi.query('role', 'users-permissions').findOne({ type: advanced.default_role }, []);

      ctx.request.body.role = defaultRole._id || defaultRole.id;
    }

    ctx.request.body.provider = 'local';

    try {
      const data = await strapi.plugins['users-permissions'].services.user.add(ctx.request.body);
      // Send 201 `created`
      ctx.created(data);
    } catch(error) {
      ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: error.message, field: error.field }] }] : error.message);
    }
  },

  /**
   * Update a/an user record.
   *
   * @return {Object}
   */

  update: async (ctx) => {
    try {
      const advancedConfigs = await strapi.store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced'
      }).get();

      if (advancedConfigs.unique_email && ctx.request.body.email) {
        const users = await strapi.plugins['users-permissions'].services.user.fetchAll({ email: ctx.request.body.email });

        if (users && _.find(users, user => (user.id || user._id).toString() !== ctx.params.id)) {
          return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.email.taken', field: ['email'] }] }] : 'Email is already taken.');
        }
      }

      const user = await strapi.plugins['users-permissions'].services.user.fetch(ctx.params);

      if (_.get(ctx.request, 'body.password') === user.password) {
        delete ctx.request.body.password;
      }

      if (_.get(ctx.request, 'body.role', '').toString() === '0' && (!_.get(ctx.state, 'user.role') || _.get(ctx.state, 'user.role', '').toString() !== '0')) {
        delete ctx.request.body.role;
      }

      if (ctx.request.body.email && advancedConfigs.unique_email) {
        const user = await strapi.query('user', 'users-permissions').findOne({
          email: ctx.request.body.email
        });

        if (user !== null && (user.id || user._id).toString() !== ctx.params.id) {
          return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.email.taken', field: ['email'] }] }] : 'Email is already taken.');
        }
      }

      const data = await strapi.plugins['users-permissions'].services.user.edit(ctx.params, ctx.request.body) ;

      // Send 200 `ok`
      ctx.send(data);
    } catch(error) {
      ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: error.message, field: error.field }] }] : error.message);
    }
  },

  /**
   * Destroy a/an user record.
   *
   * @return {Object}
   */

  destroy: async (ctx) => {
    const data = await strapi.plugins['users-permissions'].services.user.remove(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  destroyAll: async (ctx) => {
    const data = await strapi.plugins['users-permissions'].services.user.removeAll(ctx.params, ctx.request.query);

    // Send 200 `ok`
    ctx.send(data);
  }
};
