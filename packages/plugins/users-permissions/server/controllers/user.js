'use strict';

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

const _ = require('lodash');
const utils = require('@strapi/utils');
const { getService } = require('../utils');
const { validateCreateUserBody, validateUpdateUserBody } = require('./validation/user');

const { sanitize } = utils;
const { ApplicationError, ValidationError, NotFoundError } = utils.errors;

const sanitizeOutput = async (user, ctx) => {
  const schema = strapi.getModel('plugin::users-permissions.user');
  const { auth } = ctx.state;

  return sanitize.contentAPI.output(user, schema, { auth });
};

const sanitizeQuery = async (query, ctx) => {
  const schema = strapi.getModel('plugin::users-permissions.user');
  const { auth } = ctx.state;

  return sanitize.contentAPI.query(query, schema, { auth });
};

module.exports = {
  /**
   * Create a/an user record.
   * @return {Object}
   */
  async create(ctx) {
    const advanced = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    await validateCreateUserBody(ctx.request.body);

    const { email, username, role } = ctx.request.body;

    const userWithSameUsername = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (userWithSameUsername) {
      if (!email) throw new ApplicationError('Username already taken');
    }

    if (advanced.unique_email) {
      const userWithSameEmail = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail) {
        throw new ApplicationError('Email already taken');
      }
    }

    const user = {
      ...ctx.request.body,
      email: email.toLowerCase(),
      provider: 'local',
    };

    if (!role) {
      const defaultRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: advanced.default_role } });

      user.role = defaultRole.id;
    }

    try {
      const data = await getService('user').add(user);
      const sanitizedData = await sanitizeOutput(data, ctx);

      ctx.created(sanitizedData);
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },

  /**
   * Update a/an user record.
   * @return {Object}
   */
  async update(ctx) {
    const advancedConfigs = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    const { id } = ctx.params;
    const { email, username, password } = ctx.request.body;

    const user = await getService('user').fetch(id);
    if (!user) {
      throw new NotFoundError(`User not found`);
    }

    await validateUpdateUserBody(ctx.request.body);

    if (user.provider === 'local' && _.has(ctx.request.body, 'password') && !password) {
      throw new ValidationError('password.notNull');
    }

    if (_.has(ctx.request.body, 'username')) {
      const userWithSameUsername = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { username } });

      if (userWithSameUsername && _.toString(userWithSameUsername.id) !== _.toString(id)) {
        throw new ApplicationError('Username already taken');
      }
    }

    if (_.has(ctx.request.body, 'email') && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail && _.toString(userWithSameEmail.id) !== _.toString(id)) {
        throw new ApplicationError('Email already taken');
      }
      ctx.request.body.email = ctx.request.body.email.toLowerCase();
    }

    const updateData = {
      ...ctx.request.body,
    };

    const data = await getService('user').edit(user.id, updateData);
    const sanitizedData = await sanitizeOutput(data, ctx);

    ctx.send(sanitizedData);
  },

  /**
   * Retrieve user records.
   * @return {Object|Array}
   */
  async find(ctx) {
    const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);
    const users = await getService('user').fetchAll(sanitizedQuery);

    ctx.body = await Promise.all(users.map((user) => sanitizeOutput(user, ctx)));
  },

  /**
   * Retrieve a user record.
   * @return {Object}
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

    let data = await getService('user').fetch(id, sanitizedQuery);

    if (data) {
      data = await sanitizeOutput(data, ctx);
    }

    ctx.body = data;
  },

  /**
   * Retrieve user count.
   * @return {Number}
   */
  async count(ctx) {
    const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

    ctx.body = await getService('user').count(sanitizedQuery);
  },

  /**
   * Destroy a/an user record.
   * @return {Object}
   */
  async destroy(ctx) {
    const { id } = ctx.params;

    const data = await getService('user').remove({ id });
    const sanitizedUser = await sanitizeOutput(data, ctx);

    ctx.send(sanitizedUser);
  },

  /**
   * Retrieve authenticated user.
   * @return {Object|Array}
   */
  async me(ctx) {
    const authUser = ctx.state.user;
    const { query } = ctx;

    if (!authUser) {
      return ctx.unauthorized();
    }

    const sanitizedQuery = await sanitizeQuery(query, ctx);
    const user = await getService('user').fetch(authUser.id, sanitizedQuery);

    ctx.body = await sanitizeOutput(user, ctx);
  },
};
