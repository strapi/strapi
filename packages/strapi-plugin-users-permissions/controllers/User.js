'use strict';

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

const _ = require('lodash');

const sanitizeUser = user => _.omit(user, ['password', 'resetPasswordToken']);
const adminError = error => [
  { messages: [{ id: error.message, field: error.field }] },
];

module.exports = {
  /**
   * Retrieve user records.
   * @return {Object|Array}
   */
  async find(ctx, next, { populate } = {}) {
    let users;

    if (_.has(ctx.query, '_q')) {
      // use core strapi query to search for users
      users = await strapi
        .query('user', 'users-permissions')
        .search(ctx.query, populate);
    } else {
      users = await strapi.plugins['users-permissions'].services.user.fetchAll(
        ctx.query,
        populate
      );
    }

    const data = users.map(sanitizeUser);
    ctx.send(data);
  },

  /**
   * Retrieve authenticated user.
   * @return {Object|Array}
   */
  async me(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [
        { messages: [{ id: 'No authorization header was found' }] },
      ]);
    }

    const data = sanitizeUser(user);
    ctx.send(data);
  },

  /**
   * Retrieve a user record.
   * @return {Object}
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    let data = await strapi.plugins['users-permissions'].services.user.fetch({
      id,
    });

    if (data) {
      data = sanitizeUser(data);
    }

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Create a/an user record.
   * @return {Object}
   */
  async create(ctx) {
    const advanced = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    const { email, username, password, role } = ctx.request.body;

    if (!email) return ctx.badRequest('missing.email');
    if (!username) return ctx.badRequest('missing.username');
    if (!password) return ctx.badRequest('missing.password');

    const userWithSameUsername = await strapi
      .query('user', 'users-permissions')
      .findOne({ username });

    if (userWithSameUsername) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? adminError({
              message: 'Auth.form.error.username.taken',
              field: ['username'],
            })
          : 'username.alreadyTaken.'
      );
    }

    if (advanced.unique_email) {
      const userWithSameEmail = await strapi
        .query('user', 'users-permissions')
        .findOne({ email });

      if (userWithSameEmail) {
        return ctx.badRequest(
          null,
          ctx.request.admin
            ? adminError({
                message: 'Auth.form.error.email.taken',
                field: ['email'],
              })
            : 'email.alreadyTaken'
        );
      }
    }

    const user = {
      ...ctx.request.body,
      provider: 'local',
    };

    if (!role) {
      const defaultRole = await strapi
        .query('role', 'users-permissions')
        .findOne({ type: advanced.default_role }, []);

      user.role = defaultRole.id;
    }

    try {
      const data = await strapi.plugins['users-permissions'].services.user.add(
        user
      );

      ctx.created(data);
    } catch (error) {
      ctx.badRequest(
        null,
        ctx.request.admin ? adminError(error) : error.message
      );
    }
  },

  /**
   * Update a/an user record.
   * @return {Object}
   */
  async update(ctx) {
    const advancedConfigs = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    const { id } = ctx.params;
    const { email, username, password } = ctx.request.body;

    if (!email) return ctx.badRequest('missing.email');
    if (!username) return ctx.badRequest('missing.username');
    if (!password) return ctx.badRequest('missing.password');

    const userWithSameUsername = await strapi
      .query('user', 'users-permissions')
      .findOne({ username });

    if (userWithSameUsername && userWithSameUsername.id != id) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? adminError({
              message: 'Auth.form.error.username.taken',
              field: ['username'],
            })
          : 'username.alreadyTaken.'
      );
    }

    if (advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi
        .query('user', 'users-permissions')
        .findOne({ email });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        return ctx.badRequest(
          null,
          ctx.request.admin
            ? adminError({
                message: 'Auth.form.error.email.taken',
                field: ['email'],
              })
            : 'email.alreadyTaken'
        );
      }
    }

    const user = await strapi.plugins['users-permissions'].services.user.fetch({
      id,
    });

    let updateData = {
      ...ctx.request.body,
    };

    if (password === user.password) {
      delete ctx.request.body.password;
    }

    const data = await strapi.plugins['users-permissions'].services.user.edit(
      { id },
      updateData
    );

    ctx.send(data);
  },

  /**
   * Destroy a/an user record.
   * @return {Object}
   */
  async destroy(ctx) {
    const { id } = ctx.params;
    const data = await strapi.plugins['users-permissions'].services.user.remove(
      { id }
    );

    ctx.send(data);
  },

  async destroyAll(ctx) {
    const data = await strapi.plugins[
      'users-permissions'
    ].services.user.removeAll(ctx.params, ctx.request.query);

    // Send 200 `ok`
    ctx.send(data);
  },
};
